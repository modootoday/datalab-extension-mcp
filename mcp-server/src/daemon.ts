/**
 * The daemon entry — one background process that owns the port and the panel.
 *
 * Wires the pieces that live in their own testable modules and adds only the
 * process-level glue: reading the environment, logging to stderr, and exiting
 * on the singleton and idle signals. Thin and injectable, but the real proof
 * lives in the per-module tests.
 */
import { timingSafeEqual } from "node:crypto";
import { createRequire } from "node:module";
import { join } from "node:path";

import { Bridge } from "./bridge.js";
import { resolveConfig, type ConfigEnv } from "./config.js";
import {
  MCP_SERVER_HEALTH_NAME,
  createHttpBridge,
  type HttpBridge,
} from "./http.js";
import { Lifecycle } from "./lifecycle.js";
import { logDir } from "./log-file.js";
import { createMediaStage } from "./media-stage.js";
import { writeTakeoverSecret } from "./takeover.js";
import { bindAsLock } from "./singleton.js";

const NAME = MCP_SERVER_HEALTH_NAME;

/**
 * The version reported in the handshake and on the health route. Read from the
 * published manifest so it cannot drift from what shipped; the relative path
 * resolves from source and from the tarball alike.
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
   * Heartbeat interval override, for tests only. A short value flushes the
   * stream promptly, which matters because some HTTP clients buffer a small
   * event until the next write.
   */
  heartbeatMs?: number;
  /**
   * Per-session rate-limit override, for tests that drive many concurrent
   * calls and must not have the limiter mask the property under test.
   */
  rateLimit?: { capacity: number; refillPerSecond: number };
  /**
   * Where this daemon keeps what it owns — staged bytes today, and whatever
   * outlives a restart later.
   *
   * Injected so a test can name a directory it created. Without it a test
   * that boots the daemon reads and writes the operator's own, and what it
   * finds there depends on the machine it runs on.
   */
  home?: string;
}

export interface RunningDaemon {
  http: HttpBridge;
  lifecycle: Lifecycle;
}

/**
 * Bring the daemon up. Returns the running pieces, or null when config
 * resolution failed and the process was told to exit. Racing daemons are
 * expected: whichever binds first wins, and the losers exit 0 on EADDRINUSE —
 * the daemon they wanted is already up.
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
  const { port, host, token, extensionIds } = resolved.config;
  const version = deps.version ?? readVersion();

  // A daemon nobody is using should not sit resident forever, so idle-exit
  // closes the panel gracefully and leaves.
  // Set once the bind is won; read by the shutdown route on every request, so
  // it cannot be captured by value at wiring time.
  let takeoverSecret: string | null = null;
  const lifecycle = new Lifecycle({
    idleMs: deps.idleMs,
    onIdle: () => {
      log("idle — no clients and no panel; shutting down");
      void http.close().finally(() => exit(0));
    },
  });

  // Each needs the other: the bridge pushes frames, the HTTP server owns the
  // socket. The closure defers the lookup until a frame is sent, by which point
  // both exist.
  const bridge = new Bridge({
    send: (frame, key) => http.send(frame, key),
    token,
    extensionIds,
    serverVersion: version,
    rateLimit: deps.rateLimit,
    log,
  });
  // Staged bytes live beside the connector log, under a root this process
  // owns. Callers name identifiers and never a path, so the only way anything
  // is written outside here is if this line changes.
  const stateDir = logDir(deps.home);
  const mediaStage = createMediaStage({ root: join(stateDir, "media") });

  const http = createHttpBridge({
    bridge,
    port,
    host,
    mediaStage,
    heartbeatMs: deps.heartbeatMs,
    identity: { name: NAME, version },
    log,
    lifecycle: {
      retain: () => lifecycle.retain(),
      release: () => lifecycle.release(),
      bump: () => lifecycle.bump(),
    },
    verifyTakeover: (presented) =>
      takeoverSecret !== null &&
      presented.length === takeoverSecret.length &&
      timingSafeEqual(Buffer.from(presented), Buffer.from(takeoverSecret)),
    onShutdown: () => {
      // The sweeper is unref'd and the exit ends the process, so nothing needs
      // cleaning up here beyond closing the server.
      log("shutdown requested by an updating adapter; stepping aside");
      void http.close().finally(() => exit(0));
    },
  });

  // Expire anything the panel never answered, which would otherwise hold a host
  // turn open until its own ceiling. The count is logged because a request that
  // never comes back looks, from both ends, like a tool that is merely slow.
  const sweeper = setInterval(() => {
    const expired = bridge.sweep();
    if (expired > 0) log(`expired ${expired} request(s) with no answer`);
  }, 5_000);
  sweeper.unref();

  bindAsLock(
    http.server,
    port,
    host,
    () => {
      log(`listening on http://${host}:${port} — waiting for the side panel`);
      // Idle accounting begins only once we ARE the daemon; a process that lost
      // the bind race never reaches here.
      lifecycle.start();
      // Written only by the winner, for the same reason: the loser must not
      // overwrite the live daemon's proof with its own.
      takeoverSecret = writeTakeoverSecret(deps.home);
      if (takeoverSecret === null) {
        log(
          "could not write the takeover file; a host configured with a different token will not be able to retire this connector automatically",
        );
      }
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

  // Last net: an unhandled rejection ends the process, so one missed await
  // would turn a single abandoned call into everyone's outage. Staying up with
  // a logged fault is the better failure.
  process.on("unhandledRejection", (reason) => {
    log(`unhandled rejection: ${String(reason)}`);
  });
  process.on("uncaughtException", (err) => {
    log(`uncaught exception: ${err.message}`);
  });

  return { http, lifecycle };
}

// The process entry point lives in its own module, never as a guarded call
// here: the bundler tree-shakes a top-level side effect out of a module that
// also has exports, so a spawned daemon would start nothing.
