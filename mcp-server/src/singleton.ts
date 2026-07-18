/**
 * Singleton arbitration — the TCP bind is the lock.
 *
 * One process owns the port; every other adapter connects to it. The mechanism
 * is not a pidfile or a lockfile — both go stale on a crash and lie after a PID
 * is reused — it is the bind itself: the OS admits exactly one listener on a
 * loopback port, so the process that binds first IS the daemon, and the losers
 * discover this by catching EADDRINUSE and exiting 0 (success by proxy — the
 * daemon they wanted is already up).
 *
 * Windows behaves the same as POSIX here: libuv does not set SO_REUSEADDR /
 * SO_EXCLUSIVEADDRUSE on a bind, so a second process cannot steal a live
 * listener. Our code must never ask for address reuse or that guarantee breaks.
 *
 * Everything with an edge (the socket connect, the child spawn) is injected, so
 * the arbitration logic is testable with neither a real port nor a real
 * process.
 */
import { createConnection, type Socket } from "node:net";
import { spawn, type SpawnOptions } from "node:child_process";

/** Resolves a connected socket, or null if nothing is listening yet. */
export type Connector = (host: string, port: number) => Promise<Socket | null>;

/** Starts the detached daemon. Return value unused — fire and forget. */
export type DaemonSpawner = (daemonEntry: string, args?: string[]) => void;

/** Injected sleep so the ready-poll never waits real milliseconds in tests. */
export type Sleeper = (ms: number) => Promise<void>;

export interface TryConnectDeps {
  /** Injected in tests; defaults to `node:net`. */
  createConnection?: typeof createConnection;
}

/**
 * Try to connect once, resolving null instead of throwing.
 *
 * A refusal (nobody listening) and a timeout are both "no daemon here yet", not
 * errors to propagate — the caller's next move is the same for either, so they
 * collapse to null. The socket is handed back live on success; the caller owns
 * closing it.
 */
export function tryConnect(
  host: string,
  port: number,
  timeoutMs: number,
  deps: TryConnectDeps = {},
): Promise<Socket | null> {
  const connect = deps.createConnection ?? createConnection;
  return new Promise<Socket | null>((resolve) => {
    let settled = false;
    const done = (value: Socket | null): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const socket = connect({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      done(null);
    }, timeoutMs);
    timer.unref?.();
    socket.once("connect", () => {
      clearTimeout(timer);
      done(socket);
    });
    socket.once("error", () => {
      clearTimeout(timer);
      done(null);
    });
  });
}

export interface SpawnDaemonDeps {
  /** Injected in tests; defaults to `node:child_process`. */
  spawn?: typeof spawn;
  /** Injected in tests; defaults to the running node binary. */
  execPath?: string;
}

/**
 * Spawn the daemon detached from this process.
 *
 * 🔴 The command is `process.execPath` (node.exe) with the daemon's ABSOLUTE
 * entry path — never `npx` and never a shell. On Windows `npx` is a `.cmd`
 * shim, so `spawn("npx")` is ENOENT and the `shell: true` workaround pops a
 * cmd.exe console window that defeats `detached` + `windowsHide` outright.
 *
 * `detached: true` + `unref()` lets this process exit while the daemon keeps
 * running; `stdio: "ignore"` unties it from any terminal (inheriting would kill
 * it when the parent's shell closes); `windowsHide: true` suppresses the
 * console window on Windows.
 */
export function spawnDaemon(
  daemonEntry: string,
  deps: SpawnDaemonDeps = {},
  args: string[] = [],
): void {
  const doSpawn = deps.spawn ?? spawn;
  const command = deps.execPath ?? process.execPath;
  const options: SpawnOptions = {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  };
  // `daemonEntry` is the script; `args` lets a caller that inlines the daemon
  // into another bin spawn it as a subcommand, e.g. [mcpBin, "serve"].
  const child = doSpawn(command, [daemonEntry, ...args], options);
  child.unref();
}

export interface EnsureDaemonDeps {
  host: string;
  port: number;
  /** Absolute path to the daemon entry the spawner will run. */
  daemonEntry: string;
  connect: Connector;
  spawn: DaemonSpawner;
  sleep: Sleeper;
  /** How many times to poll for readiness after spawning. Default 40. */
  attempts?: number;
  /** Gap between readiness polls. Default 50ms (40 × 50ms ≈ 2s budget). */
  intervalMs?: number;
}

/**
 * Ensure a daemon is up, returning a socket connected to it.
 *
 * Fast path first: if a daemon already owns the port, connect and return
 * without spawning anything. Otherwise spawn unconditionally (racing is fine —
 * the loser's daemon exits 0 on EADDRINUSE) and poll until it answers. If it
 * never does inside the budget, throw rather than hang the caller forever.
 */
export async function ensureDaemon(deps: EnsureDaemonDeps): Promise<Socket> {
  const fast = await deps.connect(deps.host, deps.port);
  if (fast) return fast;

  deps.spawn(deps.daemonEntry);

  const attempts = deps.attempts ?? 40;
  const intervalMs = deps.intervalMs ?? 50;
  for (let i = 0; i < attempts; i += 1) {
    await deps.sleep(intervalMs);
    const socket = await deps.connect(deps.host, deps.port);
    if (socket) return socket;
  }
  throw new Error("daemon did not become ready");
}

/** The slice of `node:http`'s Server that bindAsLock touches — structural for tests. */
export interface BindableServer {
  on(event: "error", handler: (err: NodeJS.ErrnoException) => void): void;
  listen(port: number, host: string, onListen: () => void): void;
}

/**
 * Bind the port as the singleton lock.
 *
 * If the bind fails with EADDRINUSE another daemon already won the race, so this
 * one calls `onTaken` (production hands that to a silent `exit 0` — it is
 * success, the daemon exists). Any other error is a real fault and rethrows.
 *
 * 🔴 `listen` is called with host + port only — never a reuseAddr option, or the
 * first-wins guarantee this lock depends on would be lost.
 */
export function bindAsLock(
  server: BindableServer,
  port: number,
  host: string,
  onListen: () => void,
  onTaken: () => void,
): void {
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      onTaken();
      return;
    }
    throw err;
  });
  server.listen(port, host, onListen);
}
