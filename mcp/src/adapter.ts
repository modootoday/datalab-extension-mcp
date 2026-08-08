/**
 * The thin stdio adapter — a stdio-to-daemon proxy that owns nothing.
 *
 * An MCP host spawns this bin; it speaks MCP over stdio and forwards its two
 * methods to the background daemon over loopback HTTP. It binds no port and
 * holds no bridge, so many adapters (one per host) share one daemon. Every
 * edge — readiness probe, child spawn, HTTP fetch — is injectable, which is
 * what makes the proxy testable without a real socket or daemon.
 */
import { spawnSync } from "node:child_process";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  agentActionableMessage,
  REQUEST_DEADLINE_MS,
} from "@modootoday/extension-app-mcp-core";
import {
  DEFAULT_HOST,
  DEFAULT_PORT,
  tryConnect,
  spawnDaemon,
} from "@modootoday/extension-app-mcp-server";

const NAME = "datalab-extension-mcp";
const PACKAGE_NAME = "@modootoday/datalab-extension-mcp";
/** How often a live session re-asks which build is canonical. */
const DEFAULT_WATCH_MS = 5 * 60 * 1000;

/** Where the canonical version comes from — ours, not the registry's. */
const CANONICAL_VERSION_URL = "https://app.datalab.tools/api/v1/mcp/version";
const CANONICAL_TIMEOUT_MS = 4000;
const SEMVER = /^\d+\.\d+\.\d+$/;

/**
 * The version the operator currently publishes as canonical.
 *
 * 🔴 Asked of OUR gateway, never of npm directly. A floating `@latest` in the
 * host config would let whoever controls the registry push code next to a
 * logged-in browser session; this keeps the decision on a surface we own, with
 * a rollback lever behind it. A failure returns null and changes nothing.
 */
export async function canonicalVersion(
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), CANONICAL_TIMEOUT_MS);
    const res = await fetchImpl(CANONICAL_VERSION_URL, {
      signal: ctl.signal,
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return null;
    const body = (await res.json()) as { version?: unknown };
    return typeof body.version === "string" && SEMVER.test(body.version)
      ? body.version
      : null;
  } catch {
    return null;
  }
}

/** How long a single readiness probe waits before giving up on the socket. */
const PROBE_TIMEOUT_MS = 300;
/** Readiness polls after a spawn: 40 × 50ms ≈ 2s, matching the daemon's own budget. */
const READY_ATTEMPTS = 40;
const READY_INTERVAL_MS = 50;

/**
 * 🔴 Anything printed must go to stderr. stdout is the MCP transport, so a
 * stray write there is a protocol frame to the host and corrupts the session.
 */
function defaultLog(message: string): void {
  process.stderr.write(`[${NAME}] ${message}\n`);
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Did this fail because nothing came back in time, rather than because there
 * was nothing to reach? Some runtimes still name that condition AbortError.
 */
function isTimeout(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.name === "TimeoutError" || err.name === "AbortError";
}

/** Real wall-clock sleep — the default the ready-poll uses outside tests. */
function realSleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Default daemon spawn — this bin, run as `serve`, detached from us. */
function defaultSpawn(daemonEntry: string, args: string[]): void {
  spawnDaemon(daemonEntry, {}, args);
}

/** The `fetch` shape this module needs — injectable so tests need no real HTTP. */
export type FetchImpl = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
    /** Cancels the request once its ceiling passes. Tests may ignore it. */
    signal?: AbortSignal;
  },
) => Promise<{ text: () => Promise<string> }>;

/** A parsed JSON-RPC response as far as the proxy cares about it. */
interface JsonRpcResponse {
  result?: {
    tools?: unknown[];
    content?: unknown;
    isError?: boolean;
    [key: string]: unknown;
  };
  error?: { code?: number; message?: string };
}

/**
 * Monotonic id for each JSON-RPC POST. The daemon correlates by the id it mints
 * for the bridge, not by this one, so any process-unique value will do.
 */
let nextRpcId = 0;

/**
 * Ceiling on one POST to the daemon. Derived from the daemon's own request
 * deadline plus room for the reply, so a tool taking its full time is never cut
 * off here — only a daemon that has stopped answering.
 */
export const POST_TIMEOUT_MS = REQUEST_DEADLINE_MS + 15_000;

/**
 * POST one JSON-RPC request to the daemon and parse the reply. Asking for JSON
 * is deliberate: the daemon only answers with SSE when a client requests
 * an event stream, so this keeps the reply a single parseable object.
 */
async function postMcp(
  fetchImpl: FetchImpl,
  url: string,
  method: string,
  params?: Record<string, unknown>,
): Promise<JsonRpcResponse> {
  nextRpcId += 1;
  const payload: Record<string, unknown> = {
    jsonrpc: "2.0",
    id: nextRpcId,
    method,
  };
  if (params !== undefined) payload["params"] = params;
  // 🔴 A local request still needs a ceiling: a daemon that stops answering
  // would otherwise leave this await outstanding forever, and the host waits
  // with it — no answer, no error, no turn.
  const res = await fetchImpl(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(POST_TIMEOUT_MS),
  });
  const text = await res.text();
  return JSON.parse(text) as JsonRpcResponse;
}

/** True when semver `a` is strictly older than `b` (plain x.y.z; no pre-release). */
export function isOlderVersion(a: string, b: string): boolean {
  const pa = a.split(".").map((n) => parseInt(n, 10));
  const pb = b.split(".").map((n) => parseInt(n, 10));
  for (let i = 0; i < 3; i += 1) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (Number.isNaN(x) || Number.isNaN(y)) return false;
    if (x !== y) return x < y;
  }
  return false;
}

/** GET /bridge/health and return the daemon's version, or null if unreadable. */
async function defaultReadVersion(base: string): Promise<string | null> {
  try {
    const res = await (globalThis.fetch as typeof fetch)(
      `${base}/bridge/health`,
    );
    const body = (await res.json()) as { name?: unknown; version?: unknown };
    return body.name === "datalab-extension-mcp-server" &&
      typeof body.version === "string"
      ? body.version
      : null;
  } catch {
    return null;
  }
}

/** Ask the running daemon to step aside. True only on an accepted (200) request. */
async function defaultShutdown(base: string, token: string): Promise<boolean> {
  try {
    const res = await (globalThis.fetch as typeof fetch)(
      `${base}/mcp/shutdown`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      },
    );
    return res.status === 200;
  } catch {
    return false;
  }
}

export interface EnsureRunningDeps {
  host?: string;
  port?: number;
  /** Probe for an existing daemon. Injected in tests; defaults to `tryConnect`. */
  connect?: (
    host: string,
    port: number,
    timeoutMs: number,
  ) => Promise<{ destroy: () => void } | null>;
  /** Start the daemon. Injected in tests; defaults to `spawnDaemon`. */
  spawn?: (daemonEntry: string, args: string[]) => void;
  /** Injected sleep so the ready-poll never waits real milliseconds in tests. */
  sleep?: (ms: number) => Promise<void>;
  /**
   * Absolute path the spawner runs. Defaults to this bin, which starts the
   * inlined daemon when run with the serve subcommand.
   */
  daemonEntry?: string;
  log?: (message: string) => void;
  attempts?: number;
  intervalMs?: number;
  /**
   * This adapter's own version. When set, a running daemon older than this is
   * replaced; one at this version or newer is left alone, so an older adapter
   * never downgrades a newer daemon. Unset means no reconciliation at all.
   */
  selfVersion?: string;
  /** Pairing token authorising the shutdown. Defaults to `DATALAB_MCP_TOKEN`. */
  token?: string;
  /** Injected in tests; defaults to reading `/bridge/health`. */
  readVersion?: (base: string) => Promise<string | null>;
  /** Injected in tests; defaults to `POST /mcp/shutdown`. */
  shutdown?: (base: string, token: string) => Promise<boolean>;
}

/**
 * Ensure a daemon is up before the adapter starts proxying. A daemon already
 * on the port ends it; otherwise spawn this bin as serve and poll. Racing is
 * fine — whichever binds first wins and the losers exit 0 on EADDRINUSE.
 *
 * Exceeding the budget logs and returns rather than throws: showing
 * disconnected beats crashing the host's whole MCP session over a slow boot.
 */
export async function ensureDaemonRunning(
  deps: EnsureRunningDeps = {},
): Promise<void> {
  const host = deps.host ?? DEFAULT_HOST;
  const port = deps.port ?? DEFAULT_PORT;
  const connect = deps.connect ?? tryConnect;
  const spawn = deps.spawn ?? defaultSpawn;
  const sleep = deps.sleep ?? realSleep;
  // The fallback only satisfies the checker's indexed-access strictness;
  // argv[1] is the script path and is always present in production.
  const daemonEntry = deps.daemonEntry ?? process.argv[1] ?? "";
  const log = deps.log ?? defaultLog;
  const attempts = deps.attempts ?? READY_ATTEMPTS;
  const intervalMs = deps.intervalMs ?? READY_INTERVAL_MS;
  const base = `http://${host}:${port}`;
  const selfVersion = deps.selfVersion;
  const token = deps.token ?? process.env["DATALAB_MCP_TOKEN"];
  const readVersion = deps.readVersion ?? defaultReadVersion;
  const shutdown = deps.shutdown ?? defaultShutdown;

  // 🔴 Spawn this bin as serve, which runs the inlined daemon rather than
  // another adapter — otherwise the spawn recurses without bound.
  const spawnAndWait = async (): Promise<void> => {
    spawn(daemonEntry, ["serve"]);
    for (let i = 0; i < attempts; i += 1) {
      await sleep(intervalMs);
      const socket = await connect(host, port, PROBE_TIMEOUT_MS);
      if (socket) {
        socket.destroy();
        return;
      }
    }
    log(
      "the connector service did not become ready in time; continuing — it will show as disconnected until it comes up",
    );
  };

  const fast = await connect(host, port, PROBE_TIMEOUT_MS);
  if (!fast) {
    await spawnAndWait();
    return;
  }
  fast.destroy();

  // A daemon already owns the port. If it is older than us an update just
  // landed, so ask it to step aside and wait for the port; without this the new
  // version never runs until the user kills the old process by hand.
  if (!selfVersion || !token) return;
  const running = await readVersion(base);
  if (!running || !isOlderVersion(running, selfVersion)) return;

  log(`updating the connector: replacing ${running} with ${selfVersion}`);
  const accepted = await shutdown(base, token);
  if (!accepted) {
    // The daemon has no shutdown route, or the token did not match. Nothing to
    // force cross-platform, so leave it: it idle-exits on its own.
    log(
      "the running connector is too old to update automatically; restart it (or wait for it to idle out) to pick up the new version",
    );
    return;
  }
  // Wait for the old daemon to release the port before spawning ours.
  for (let i = 0; i < attempts; i += 1) {
    const socket = await connect(host, port, PROBE_TIMEOUT_MS);
    if (!socket) break;
    socket.destroy();
    await sleep(intervalMs);
  }
  await spawnAndWait();
}

export interface AdapterServerDeps {
  /**
   * Marks a request as started (+1) and finished (-1). The promotion watcher
   * uses it to swap builds only while nothing is in flight — re-execing mid
   * request would drop that call on the floor.
   */
  onActivity?: (delta: 1 | -1) => void;
  host?: string;
  port?: number;
  /** Injected in tests; defaults to the global `fetch`. */
  fetchImpl?: FetchImpl;
  log?: (message: string) => void;
  /** MCP handshake identity reported to the host. */
  name?: string;
  version?: string;
  /**
   * Brings the daemon back when a call finds nothing listening. Injected in
   * tests; defaults to `ensureDaemonRunning`.
   */
  revive?: (deps: EnsureRunningDeps) => Promise<void>;
}

/**
 * Build the low-level MCP Server whose two handlers proxy to the daemon. The
 * low-level form fits because we own no tools and declare no static schema —
 * the catalog is discovered from the daemon and changes while running.
 */
export function createAdapterServer(deps: AdapterServerDeps = {}): Server {
  const host = deps.host ?? DEFAULT_HOST;
  const port = deps.port ?? DEFAULT_PORT;
  const fetchImpl =
    deps.fetchImpl ?? (globalThis.fetch as unknown as FetchImpl);
  const log = deps.log ?? defaultLog;
  const mcpUrl = `http://${host}:${port}/mcp`;
  const revive = deps.revive ?? ensureDaemonRunning;

  const server = new Server(
    { name: deps.name ?? NAME, version: deps.version ?? "0.0.0" },
    // Declares that we send list-changed notifications: the daemon signals us
    // when the panel connects or drops, and forwarding it lets the host
    // re-fetch the catalog without a restart.
    { capabilities: { tools: { listChanged: true } } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    deps.onActivity?.(1);
    try {
      const resp = await postMcp(fetchImpl, mcpUrl, "tools/list");
      if (resp.error) {
        // 🔴 Never an empty catalog. A disconnected panel is answered upstream
        // with the last-known list, so an error here is a real fault — and
        // many hosts cache the first list they get and would stay empty.
        log(`tools/list error: ${resp.error.message ?? "unknown"}`);
        throw new McpError(
          ErrorCode.InternalError,
          resp.error.message ?? "The connector reported an error.",
        );
      }
      return { tools: resp.result?.tools ?? [] };
    } catch (err) {
      // Already shaped above — do not re-wrap (that would bury the message).
      if (err instanceof McpError) throw err;
      // The daemon is unreachable. Which failure it was changes what the user
      // should go and do, so keep the same vocabulary a tool call uses.
      log(`tools/list transport failure: ${describeError(err)}`);
      throw new McpError(
        ErrorCode.InternalError,
        agentActionableMessage(
          isTimeout(err) ? "connector_stuck" : "not_connected",
        ),
      );
    } finally {
      deps.onActivity?.(-1);
    }
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    deps.onActivity?.(1);
    try {
      return await handleToolCall(request);
    } finally {
      deps.onActivity?.(-1);
    }
  });

  async function handleToolCall(request: {
    params: { name: string; arguments?: Record<string, unknown> };
  }): Promise<Record<string, unknown>> {
    const { name, arguments: args } = request.params;
    let resp: JsonRpcResponse;
    try {
      resp = await postMcp(fetchImpl, mcpUrl, "tools/call", {
        name,
        arguments: args ?? {},
      });
    } catch (first) {
      // 🔴 The daemon idle-exits by design, and a host that spent longer than
      // the window thinking arrives here with nothing listening. Bring it back
      // and try once more before telling the model the connector is down.
      //
      // A timeout is a different fault — the daemon answered late, so it IS
      // there — and respawning on top of a live process would race it.
      if (isTimeout(first)) return failedCall(first);
      try {
        resp = await reviveAndRetry(name, args);
      } catch (second) {
        return failedCall(second);
      }
    }
    return shapeCallResult(name, resp);
  }

  /** One respawn, one retry. Beyond that the fault is not a missing daemon. */
  async function reviveAndRetry(
    name: string,
    args: Record<string, unknown> | undefined,
  ): Promise<JsonRpcResponse> {
    log(`tools/call found no connector; restarting it and retrying ${name}`);
    await revive({
      host: deps.host,
      port: deps.port,
      log,
      selfVersion: deps.version,
    });
    return postMcp(fetchImpl, mcpUrl, "tools/call", {
      name,
      arguments: args ?? {},
    });
  }

  /**
   * A readable tool result beats a throw the model cannot act on, and a refusal
   * and a timeout send the user to different places, so the two stay distinct.
   */
  function failedCall(err: unknown): Record<string, unknown> {
    log(`tools/call transport failure: ${describeError(err)}`);
    return {
      content: [
        {
          type: "text",
          text: agentActionableMessage(
            isTimeout(err) ? "connector_stuck" : "not_connected",
          ),
        },
      ],
      isError: true,
    };
  }

  function shapeCallResult(
    name: string,
    resp: JsonRpcResponse,
  ): Record<string, unknown> {
    void name;
    if (resp.error) {
      // The daemon shaped this failure as a JSON-RPC error carrying actionable
      // guidance; re-raise it so the host renders it on that same channel.
      throw new McpError(
        ErrorCode.InternalError,
        resp.error.message ?? "The connector reported an error.",
      );
    }
    // The daemon already shaped the success as an MCP tool result, so it passes
    // through unchanged. The fallback covers a reply carrying neither error nor
    // result, keeping the return a valid MCP result.
    return resp.result ?? {};
  }

  return server;
}

/**
 * Read the daemon's notification stream, invoking the callback with each data
 * payload. Injectable so the subscription loop is testable without a real
 * stream. Heartbeat comment lines are not data and never reach the callback.
 */
export type SubscribeImpl = (
  url: string,
  onEvent: (data: string) => void,
  signal: AbortSignal,
) => Promise<void>;

const defaultSubscribe: SubscribeImpl = async (url, onEvent, signal) => {
  const res = await (globalThis.fetch as typeof fetch)(url, { signal });
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const raw = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      if (raw.startsWith("data: ")) onEvent(raw.slice(6));
    }
  }
};

export interface ToolChangeDeps {
  mcpUrl: string;
  /** Called for a tools_changed event — the host is told to re-fetch. */
  notifyHost: () => Promise<void>;
  subscribe?: SubscribeImpl;
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
  signal: AbortSignal;
  /** Injected for deterministic backoff in tests. */
  rng?: () => number;
  now?: () => number;
  /**
   * Brings the daemon back when it is gone. Injected in tests; defaults to
   * `ensureDaemonRunning`.
   */
  revive?: (deps: EnsureRunningDeps) => Promise<void>;
  /** Passed through to revive so a stale older daemon is still replaced. */
  selfVersion?: string;
}

/**
 * Reconnect backoff for the notifications subscription — decorrelated jitter,
 * because one adapter per host means a daemon restart would otherwise have them
 * all reconnect in lockstep. The base is small since the daemon is local, and a
 * subscription that held before dropping resets the backoff.
 */
export const TOOLCHANGE_BACKOFF_BASE_MS = 250;
export const TOOLCHANGE_BACKOFF_CAP_MS = 5_000;

/**
 * 🔴 Consecutive connect failures before the daemon is presumed gone and
 * respawned. The idle exit is correct — an abandoned daemon should reclaim
 * itself — but nothing was bringing it back, so a host that thought for longer
 * than the idle window found the next tool call had nowhere to go.
 *
 * Three, not one: a single failure is also what a daemon restarting under an
 * update looks like, and racing that would have two adapters spawning at once.
 */
export const TOOLCHANGE_REVIVE_AFTER_FAILURES = 3;

/**
 * Forward the daemon's tool-catalog changes to the host, reconnecting whenever
 * the subscription drops. A drop is normal — the daemon is a process the user
 * can stop — so it is retried rather than surfaced as an error.
 */
export async function pushToolChanges(deps: ToolChangeDeps): Promise<void> {
  const subscribe = deps.subscribe ?? defaultSubscribe;
  const sleep = deps.sleep ?? realSleep;
  const rng = deps.rng ?? Math.random;
  const now = deps.now ?? Date.now;
  const url = `${deps.mcpUrl.replace(/\/mcp$/, "")}/mcp/notifications`;
  const revive = deps.revive ?? ensureDaemonRunning;
  // Decorrelated jitter: prev seeds the next window.
  let prev = TOOLCHANGE_BACKOFF_BASE_MS;
  let failures = 0;
  while (!deps.signal.aborted) {
    const startedAt = now();
    try {
      await subscribe(
        url,
        (data) => {
          try {
            const frame = JSON.parse(data) as { type?: unknown };
            if (frame.type === "tools_changed") void deps.notifyHost();
          } catch {
            // A non-JSON line is not ours to act on; ignore it.
          }
        },
        deps.signal,
      );
    } catch {
      // Stream dropped — reconnect after a jittered beat unless we are shutting down.
    }
    if (deps.signal.aborted) return;
    // Holding at least a base interval means a real connection dropped, not a
    // failing connect — reset so the reconnect is prompt.
    const held = now() - startedAt >= TOOLCHANGE_BACKOFF_BASE_MS;
    if (held) {
      prev = TOOLCHANGE_BACKOFF_BASE_MS;
      failures = 0;
    } else {
      failures += 1;
    }
    // A subscription that will not even open, repeatedly, means there is
    // nothing listening. Bring it back rather than retrying into a closed port
    // for the rest of the session.
    if (failures >= TOOLCHANGE_REVIVE_AFTER_FAILURES) {
      failures = 0;
      try {
        await revive({ log: deps.log, selfVersion: deps.selfVersion });
      } catch {
        // Respawn is best-effort; the loop keeps retrying either way.
      }
    }
    // random_between(base, prev*3), capped.
    const upper = Math.min(TOOLCHANGE_BACKOFF_CAP_MS, prev * 3);
    const wait = Math.round(
      TOOLCHANGE_BACKOFF_BASE_MS + rng() * (upper - TOOLCHANGE_BACKOFF_BASE_MS),
    );
    await sleep(wait);
    prev = wait;
  }
}

export interface RunAdapterDeps extends AdapterServerDeps {
  /** Injected in tests; how often the canonical version is re-checked. */
  watchIntervalMs?: number;
  /** Injected in tests; defaults to asking the gateway. */
  canonical?: typeof canonicalVersion;
  /** Injected in tests; defaults to the real spawn. */
  spawnImpl?: typeof spawnSync;
  /** Injected in tests; defaults to `ensureDaemonRunning`. */
  ensure?: (deps: EnsureRunningDeps) => Promise<void>;
  /** Injected in tests; defaults to a real stdio transport. */
  transport?: Transport;
  /** Injected in tests; defaults to the real SSE subscription. */
  subscribe?: SubscribeImpl;
  /** false pins this build — `--no-self-update`. Default promotes to canonical. */
  selfUpdate?: boolean;
}

/**
 * Run the adapter: make sure a daemon exists, then serve MCP over stdio. The
 * two legs stay separate so each is testable alone, and this is the only place
 * that touches the real stdio transport.
 */
/**
 * Replace this process with the canonical build, keeping the session.
 *
 * 🔴 The host config names an exact version on purpose, so a release never
 * reaches a paired user by itself — the command they pasted keeps launching the
 * version it names, forever. Rather than refusing to serve that user (which
 * ends whatever they were doing) the adapter re-execs itself as the canonical
 * build with the SAME argv: same port, same token, same stdio, so the host sees
 * one continuous connector that happens to be newer.
 *
 * Opt out with `--no-self-update` when pinning is the point (bisecting a
 * regression, or an air-gapped run where the fetch cannot succeed anyway).
 */
export async function selfUpdateAndRestart(
  selfVersion: string | undefined,
  log: (m: string) => void,
  deps: {
    resolve?: typeof canonicalVersion;
    spawn?: typeof spawnSync;
    argv?: string[];
  } = {},
): Promise<boolean> {
  if (!selfVersion) return false;
  const target = await (deps.resolve ?? canonicalVersion)();
  if (!target || !isOlderVersion(selfVersion, target)) return false;

  const args = deps.argv ?? process.argv.slice(2);
  log(
    `updating to the canonical connector ${target} (this build is ${selfVersion})`,
  );
  const run = deps.spawn ?? spawnSync;
  const res = run("npx", ["-y", `${PACKAGE_NAME}@${target}`, ...args], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (res.error) {
    // Carry on as this version rather than leaving the host with nothing: an
    // outdated connector still beats a connector that failed to start.
    log(
      `could not start ${target} (${res.error.message}); continuing as ${selfVersion}`,
    );
    return false;
  }
  process.exit(res.status ?? 0);
}

/**
 * Tracks how many requests are running so the promotion watcher can wait for a
 * quiet moment, while still passing the signal on to any caller that wants it.
 */
export function countRequests(
  flight: { count: number },
  passthrough?: (delta: 1 | -1) => void,
): (delta: 1 | -1) => void {
  return (delta) => {
    flight.count += delta;
    passthrough?.(delta);
  };
}

export async function runAdapter(deps: RunAdapterDeps = {}): Promise<void> {
  // Before anything touches the port: if a newer build is canonical, hand the
  // whole session to it instead of serving from this one.
  if (deps.selfUpdate !== false) {
    await selfUpdateAndRestart(deps.version, deps.log ?? (() => {}), {
      resolve: deps.canonical,
      spawn: deps.spawnImpl,
    });
  }
  const ensure = deps.ensure ?? ensureDaemonRunning;
  // Passing our own version is what lets a stale older daemon still holding the
  // port after an update be replaced instead of silently reused.
  await ensure({
    host: deps.host,
    port: deps.port,
    log: deps.log,
    selfVersion: deps.version,
  });

  // 🔴 Promotion cannot be a start-up-only check. A release lands while a host
  // is mid-session and that session would otherwise keep the superseded build
  // alive for as long as the user leaves the app open — which is exactly the
  // "old version keeps running" case pinning was supposed to end. The watcher
  // re-asks on an interval and swaps only while nothing is in flight, so no
  // call is dropped to make the swap.
  const flight = { count: 0 };
  const watchMs = deps.watchIntervalMs ?? DEFAULT_WATCH_MS;
  const server = createAdapterServer({
    ...deps,
    onActivity: countRequests(flight, deps.onActivity),
  });
  const watch =
    deps.selfUpdate === false
      ? null
      : setInterval(() => {
          if (flight.count > 0) return;
          void selfUpdateAndRestart(deps.version, deps.log ?? (() => {}), {
            resolve: deps.canonical,
            spawn: deps.spawnImpl,
          });
        }, watchMs);
  // Never hold the process open on our account.
  watch?.unref?.();
  let transport: Transport;
  if (deps.transport) {
    transport = deps.transport;
  } else {
    transport = new StdioServerTransport();
  }
  await server.connect(transport);

  // Forward catalog changes so the host re-fetches when the panel connects or
  // drops. Fire-and-forget, bound to the transport's close so a host that
  // disconnects tears the subscription down with it.
  const host = deps.host ?? DEFAULT_HOST;
  const port = deps.port ?? DEFAULT_PORT;
  const controller = new AbortController();
  const prevOnClose = transport.onclose;
  transport.onclose = () => {
    if (watch) clearInterval(watch);
    controller.abort();
    prevOnClose?.();
  };
  void pushToolChanges({
    mcpUrl: `http://${host}:${port}/mcp`,
    notifyHost: () =>
      server
        .notification({ method: "notifications/tools/list_changed" })
        .catch(() => {}),
    subscribe: deps.subscribe,
    log: deps.log,
    signal: controller.signal,
  });
}

export interface CliHandlers {
  install: (
    sub: "install" | "uninstall",
    argv: readonly string[],
  ) => Promise<void>;
  serve: () => void;
  adapter: () => Promise<void>;
}

/**
 * Route argv to one of the three subcommand handlers. Kept out of the entry so
 * the routing is testable with injected handlers. The default, with no
 * recognised subcommand, is the adapter — what an MCP host spawns.
 */
export async function dispatchCli(
  argv: readonly string[],
  handlers: CliHandlers,
): Promise<void> {
  const sub = argv[2];
  if (sub === "install" || sub === "uninstall") {
    await handlers.install(sub, argv.slice(3));
    return;
  }
  if (sub === "serve") {
    handlers.serve();
    return;
  }
  await handlers.adapter();
}
