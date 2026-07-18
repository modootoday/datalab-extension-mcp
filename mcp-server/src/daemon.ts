/**
 * The daemon entry — one background process that owns the port and the panel.
 *
 * This is what `serve` runs and what an adapter spawns (via
 * `process.execPath` + this file's absolute path). It wires the pieces that
 * live in their own testable modules — config, bridge, http surface, singleton
 * lock, idle lifecycle — and adds only the process-level glue: reading the
 * environment, logging to stderr, and exiting on the singleton and idle
 * signals.
 *
 * Kept thin and injectable so the wiring itself is testable, but the real proof
 * lives in the per-module unit tests and the mock e2e; this file is glue.
 */
import { createRequire } from "node:module";

import { Bridge } from "./bridge.js";
import { resolveConfig, type ConfigEnv } from "./config.js";
import { createHttpBridge, type HttpBridge } from "./http.js";
import { Lifecycle } from "./lifecycle.js";
import { bindAsLock } from "./singleton.js";

const NAME = "datalab-extension-mcp-server";

/**
 * The version reported in the handshake and at `/bridge/health`.
 *
 * Read from the published manifest rather than typed here, so it cannot drift
 * from what actually shipped. `../package.json` resolves both from `dist/` in
 * the tarball and from source.
 */
function readVersion(): string {
  return (
    createRequire(import.meta.url)("../package.json") as { version: string }
  ).version;
}

export interface RunDaemonDeps {
  /** Diagnostics sink. stderr in production — the daemon has no stdout contract. */
  log?: (message: string) => void;
  /** Process exit. Injected so the singleton / idle paths are testable. */
  exit?: (code: number) => void;
  /** Overrides the manifest version. Injected in tests. */
  version?: string;
  /** Idle window override. Injected in tests. */
  idleMs?: number;
  /**
   * SSE heartbeat interval override. Injected in tests only — production uses
   * the 20s default. A short value flushes the stream promptly, which the mock
   * e2e needs because undici (inside the test worker) buffers a small SSE frame
   * until the next write, unlike a real browser's EventSource.
   */
  heartbeatMs?: number;
  /**
   * Per-session rate-limit override. Production uses the bridge default; a test
   * that drives many concurrent calls to prove correlation raises it so the
   * limiter (which has its own coverage in the bridge suite) does not mask the
   * property under test.
   */
  rateLimit?: { capacity: number; refillPerSecond: number };
}

export interface RunningDaemon {
  http: HttpBridge;
  lifecycle: Lifecycle;
}

/**
 * Bring the daemon up.
 *
 * Returns the running pieces (for a caller that wants to shut it down) or null
 * when config resolution failed and the process was told to exit. Racing
 * daemons are expected: whichever binds first wins, and the losers hit
 * EADDRINUSE and exit 0 — that is success, the daemon they wanted is already up.
 */
export function runDaemon(
  env: ConfigEnv,
  deps: RunDaemonDeps = {},
): RunningDaemon | null {
  const log =
    deps.log ??
    ((message: string) => process.stderr.write(`[${NAME}] ${message}\n`));
  const exit = deps.exit ?? ((code: number) => process.exit(code));

  const resolved = resolveConfig(env);
  if (!resolved.ok) {
    log(resolved.message);
    exit(1);
    return null;
  }
  const { port, host, token, extensionId } = resolved.config;
  const version = deps.version ?? readVersion();

  // Idle-exit closes the panel gracefully, then leaves. A daemon nobody is
  // using should not sit resident forever.
  const lifecycle = new Lifecycle({
    idleMs: deps.idleMs,
    onIdle: () => {
      log("idle — no clients and no panel; shutting down");
      void http.close().finally(() => exit(0));
    },
  });

  // Each needs the other: the bridge pushes frames, the HTTP server owns the
  // socket. The closure defers the lookup until a frame is actually sent, by
  // which point both exist.
  const bridge = new Bridge({
    send: (frame) => {
      http.send(frame);
    },
    token,
    extensionId,
    serverVersion: version,
    rateLimit: deps.rateLimit,
    log,
  });
  const http = createHttpBridge({
    bridge,
    port,
    host,
    heartbeatMs: deps.heartbeatMs,
    identity: { name: NAME, version },
    lifecycle: {
      retain: () => lifecycle.retain(),
      release: () => lifecycle.release(),
      bump: () => lifecycle.bump(),
    },
    onShutdown: () => {
      // The sweeper is unref'd and exit(0) ends the process, so there is nothing
      // to clean up here beyond closing the server.
      log("shutdown requested by an updating adapter; stepping aside");
      void http.close().finally(() => exit(0));
    },
  });

  // Expire anything the panel never answered. Without this a dropped reply
  // would hold a host turn open until its own ceiling.
  const sweeper = setInterval(() => bridge.sweep(), 5_000);
  sweeper.unref();

  bindAsLock(
    http.server,
    port,
    host,
    () => {
      log(`listening on http://${host}:${port} — waiting for the side panel`);
      // Begin idle accounting only once we are the daemon: a process that lost
      // the bind race never gets here (it went through onTaken instead).
      lifecycle.start();
    },
    () => {
      // Another daemon already owns the port — success by proxy, not a fault.
      log("another instance already owns the port; exiting");
      clearInterval(sweeper);
      exit(0);
    },
  );

  const shutdown = (): void => {
    clearInterval(sweeper);
    void http.close().finally(() => exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return { http, lifecycle };
}

// NOTE: the process-starting entry point is `serve.ts`, NOT a guarded
// `if (isDirectRun())` block here. tsup/esbuild tree-shakes a top-level
// side-effect out of a module that ALSO has exports (this one exports
// runDaemon), so the guard silently vanished from the built dist and a
// spawned `node dist/daemon.js` started nothing. serve.ts has no exports, so
// its top-level call survives the build. Verified by spawning the built file.
