/**
 * Singleton arbitration — the TCP bind is the lock.
 *
 * Not a pidfile: those go stale on a crash and lie after a PID is reused. The
 * OS admits exactly one listener on a loopback port, so whoever binds first IS
 * the daemon and the losers exit 0 on EADDRINUSE.  This holds on every
 * platform only while nothing asks for address reuse.
 */
import { createConnection, type Socket } from "node:net";
import { spawn, type SpawnOptions } from "node:child_process";
import { closeSync } from "node:fs";

import { openLogFd } from "./log-file.js";

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
 * Try to connect once, resolving null instead of throwing. A refusal and a
 * timeout both mean no daemon here yet and lead to the same next move, so they
 * collapse to null. On success the caller owns closing the socket.
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
  /**
   * Where the child's stderr goes. Defaults to the connector log; pass null to
   * discard it. Injected so tests never touch a real home directory, and a
   * caller that passes one keeps ownership of closing it.
   */
  logFd?: number | null;
}

/**
 * Spawn the daemon detached from this process.
 *
 * The command is the node binary with the daemon's absolute entry path,
 * never a package runner and never a shell. On Windows those runners are
 * shims, so spawning one fails and the shell workaround pops a console window
 * that defeats detaching. Detaching lets this process exit while it runs on.
 */
export function spawnDaemon(
  daemonEntry: string,
  deps: SpawnDaemonDeps = {},
  args: string[] = [],
): void {
  const doSpawn = deps.spawn ?? spawn;
  const command = deps.execPath ?? process.execPath;
  // Detached means no terminal, so stderr goes to a size-capped file.  stdout
  // stays closed: anything reading this process would take it for protocol.
  const logFd = deps.logFd === undefined ? openLogFd() : deps.logFd;
  const options: SpawnOptions = {
    detached: true,
    stdio: logFd === null ? "ignore" : ["ignore", "ignore", logFd],
    windowsHide: true,
  };
  // The extra arguments let a caller that inlines the daemon into another bin
  // spawn it as a subcommand.
  const child = doSpawn(command, [daemonEntry, ...args], options);
  child.unref();
  // The child holds its own handle; ours would otherwise stay open for the life
  // of this process, which for the adapter is the whole session.
  if (logFd !== null && deps.logFd === undefined) {
    try {
      closeSync(logFd);
    } catch {
      // Already gone — nothing to release.
    }
  }
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
 * Ensure a daemon is up, returning a socket connected to it. A daemon already
 * on the port is used as is; otherwise spawn unconditionally (racing is fine)
 * and poll. Exceeding the budget throws rather than hanging the caller.
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

/** The slice of node:http's Server that bindAsLock touches — structural for tests. */
export interface BindableServer {
  on(event: "error", handler: (err: NodeJS.ErrnoException) => void): void;
  listen(port: number, host: string, onListen: () => void): void;
}

/**
 * Bind the port as the singleton lock. EADDRINUSE means another daemon won the
 * race, so the taken callback runs and production exits 0; anything else
 * rethrows.
 *
 * Listen takes host and port only — an address-reuse option would destroy the
 * first-wins guarantee this lock depends on.
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
