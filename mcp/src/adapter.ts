/**
 * The thin stdio adapter — a stdio↔daemon proxy that owns nothing.
 *
 * An MCP host spawns this bin; it speaks MCP over stdio to that host and
 * forwards the two methods it supports (`tools/list`, `tools/call`) to the
 * background daemon over loopback HTTP. It binds no port and holds no bridge:
 * the daemon owns 127.0.0.1:8765 and the panel connection, and many adapters
 * (one per host) share that single daemon. This is why the earlier
 * one-server-per-host model was replaced — every host raced for the same port
 * and only one survived.
 *
 * Everything with an edge (the readiness probe, the child spawn, the HTTP
 * fetch) is injectable, so the whole proxy is unit-testable with neither a real
 * socket nor a real daemon.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { agentActionableMessage } from "@modootoday/extension-app-mcp-core";
import {
  DEFAULT_HOST,
  DEFAULT_PORT,
  tryConnect,
  spawnDaemon,
} from "@modootoday/extension-app-mcp-server";

const NAME = "datalab-extension-mcp";

/** How long a single readiness probe waits before giving up on the socket. */
const PROBE_TIMEOUT_MS = 300;
/** Readiness polls after a spawn: 40 × 50ms ≈ 2s, matching the daemon's own budget. */
const READY_ATTEMPTS = 40;
const READY_INTERVAL_MS = 50;

/**
 * Anything printed must go to stderr.
 *
 * stdout is the MCP transport: a stray write there is a protocol frame as far
 * as the host is concerned, and corrupts the session. The spec reserves stderr
 * for logging and forbids a client from reading it as failure.
 */
function defaultLog(message: string): void {
  process.stderr.write(`[${NAME}] ${message}\n`);
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
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
 * Monotonic id for each JSON-RPC POST.
 *
 * The daemon is stateless and keys correlation by the request id it mints for
 * the bridge, not by this one, so any unique value works; a counter is the
 * cheapest thing that stays unique within a process.
 */
let nextRpcId = 0;

/**
 * POST one JSON-RPC request to the daemon's `/mcp` and parse the reply.
 *
 * `accept: application/json` is deliberate: the daemon answers Cursor's
 * streamable-HTTP clients with SSE only when they ask for `text/event-stream`,
 * so asking for JSON keeps the reply a single parseable object with no SSE
 * framing to strip.
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
  const res = await fetchImpl(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
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
   * Absolute path the spawner runs. Defaults to this bin (`process.argv[1]`):
   * running THIS file with the `serve` subcommand starts the inlined daemon.
   */
  daemonEntry?: string;
  log?: (message: string) => void;
  attempts?: number;
  intervalMs?: number;
  /**
   * This adapter's own version. When set, a running daemon OLDER than this is
   * replaced (it is a stale one still holding the port after an update); a daemon
   * at this version or newer is left alone, so an older adapter never downgrades
   * a newer daemon. Unset ⇒ no reconciliation (the daemon is used as-is).
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
 * Ensure a daemon is up before the adapter starts proxying.
 *
 * Fast path first: if a daemon already owns the port, we are done — we only
 * needed to know it exists, so the probe socket is closed immediately and the
 * real calls go over HTTP. Otherwise spawn THIS bin as `serve` (which runs the
 * inlined daemon) and poll until it answers. Racing is fine: whichever daemon
 * binds first wins and the losers exit 0 on EADDRINUSE.
 *
 * If it never comes up inside the budget we log and return rather than throw —
 * the panel-status card will show disconnected, which is a far better outcome
 * than crashing the host's whole MCP session over a daemon that is slow to boot.
 */
export async function ensureDaemonRunning(
  deps: EnsureRunningDeps = {},
): Promise<void> {
  const host = deps.host ?? DEFAULT_HOST;
  const port = deps.port ?? DEFAULT_PORT;
  const connect = deps.connect ?? tryConnect;
  const spawn = deps.spawn ?? defaultSpawn;
  const sleep = deps.sleep ?? realSleep;
  // `process.argv[1]` is the script path this bin was started from — always
  // defined in production; the `?? ""` only satisfies the checker's indexed-
  // access strictness.
  const daemonEntry = deps.daemonEntry ?? process.argv[1] ?? "";
  const log = deps.log ?? defaultLog;
  const attempts = deps.attempts ?? READY_ATTEMPTS;
  const intervalMs = deps.intervalMs ?? READY_INTERVAL_MS;
  const base = `http://${host}:${port}`;
  const selfVersion = deps.selfVersion;
  const token = deps.token ?? process.env["DATALAB_MCP_TOKEN"];
  const readVersion = deps.readVersion ?? defaultReadVersion;
  const shutdown = deps.shutdown ?? defaultShutdown;

  // Spawn THIS bin as `serve` (which runs the inlined daemon, not the adapter —
  // no infinite adapter→adapter spawn) and poll until it answers.
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

  // A daemon already owns the port. If it is OLDER than us, an update just
  // landed and the stale daemon is still holding the port — ask it to step
  // aside, wait for the port to free, then bring ours up. Without this the new
  // version never runs until the user kills the old process by hand.
  if (!selfVersion || !token) return;
  const running = await readVersion(base);
  if (!running || !isOlderVersion(running, selfVersion)) return;

  log(`updating the connector: replacing ${running} with ${selfVersion}`);
  const accepted = await shutdown(base, token);
  if (!accepted) {
    // An older daemon that predates the shutdown route (or a token mismatch).
    // Nothing to force cross-platform, so leave it: it idle-exits on its own,
    // and a host restart picks up the new version.
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
  host?: string;
  port?: number;
  /** Injected in tests; defaults to the global `fetch`. */
  fetchImpl?: FetchImpl;
  log?: (message: string) => void;
  /** MCP handshake identity reported to the host. */
  name?: string;
  version?: string;
}

/**
 * Build the low-level MCP `Server` whose two handlers proxy to the daemon.
 *
 * The low-level `Server` (not `McpServer`) is the honest fit: we own no tools
 * and declare no static schema — the catalog is discovered at runtime from the
 * daemon and changes while running. The request-handler form matches that, and
 * it is the same shape the daemon it replaced used, so the host sees no
 * difference across the swap.
 */
export function createAdapterServer(deps: AdapterServerDeps = {}): Server {
  const host = deps.host ?? DEFAULT_HOST;
  const port = deps.port ?? DEFAULT_PORT;
  const fetchImpl =
    deps.fetchImpl ?? (globalThis.fetch as unknown as FetchImpl);
  const log = deps.log ?? defaultLog;
  const mcpUrl = `http://${host}:${port}/mcp`;

  const server = new Server(
    { name: deps.name ?? NAME, version: deps.version ?? "0.0.0" },
    // `listChanged` tells the host we will send notifications/tools/list_changed
    // — the daemon signals us when the panel connects or drops, and we forward
    // it so the host re-fetches the catalog without a restart.
    { capabilities: { tools: { listChanged: true } } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    try {
      const resp = await postMcp(fetchImpl, mcpUrl, "tools/list");
      if (resp.error) {
        // The daemon reported a listing failure. A disconnected panel is the
        // normal state, not a fault, so degrade to an empty catalog and let the
        // host retry rather than erroring the connection out from under it.
        log(`tools/list error: ${resp.error.message ?? "unknown"}`);
        return { tools: [] };
      }
      return { tools: resp.result?.tools ?? [] };
    } catch (err) {
      // The daemon was reachable at startup but the socket is gone now. Same
      // graceful degrade: empty list, host retries.
      log(`tools/list transport failure: ${describeError(err)}`);
      return { tools: [] };
    }
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    let resp: JsonRpcResponse;
    try {
      resp = await postMcp(fetchImpl, mcpUrl, "tools/call", {
        name,
        arguments: args ?? {},
      });
    } catch (err) {
      // The daemon went away between the readiness probe and this call. Return a
      // readable tool result rather than throwing: a throw surfaces as a bare
      // protocol error the model cannot act on, whereas this message tells the
      // user exactly what to do.
      log(`tools/call transport failure: ${describeError(err)}`);
      return {
        content: [
          { type: "text", text: agentActionableMessage("not_connected") },
        ],
        isError: true,
      };
    }
    if (resp.error) {
      // The daemon shaped a failure as a JSON-RPC error carrying frozen,
      // user-actionable guidance. Re-raise it as an McpError so the host renders
      // it on the error channel it already understands.
      throw new McpError(
        ErrorCode.InternalError,
        resp.error.message ?? "The connector reported an error.",
      );
    }
    // The daemon already shaped the success as an MCP tool result
    // (`{ content: [...] }`), so pass it through unchanged. The `?? {}` covers
    // the impossible shape of a reply with neither error nor result, keeping the
    // return a valid (non-undefined) MCP result.
    return resp.result ?? {};
  });

  return server;
}

/**
 * Read the daemon's `/mcp/notifications` SSE stream, calling `onEvent` with each
 * `data:` payload. Injectable so the subscription loop is testable without a
 * real stream. Heartbeat comments (`: hb`) are not data lines, so they are
 * skipped here and never reach `onEvent`.
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
}

/**
 * Reconnect backoff for the notifications subscription — decorrelated jitter.
 *
 * One adapter per host, so after a daemon restart every adapter would otherwise
 * reconnect in lockstep on the old fixed 1s; jitter spreads them. Base is small
 * (fast first retry — the daemon is a local process the user just restarted),
 * capped low. A subscription that HELD before dropping resets the backoff, so a
 * long-lived connection that finally drops reconnects promptly rather than at a
 * grown delay.
 */
export const TOOLCHANGE_BACKOFF_BASE_MS = 250;
export const TOOLCHANGE_BACKOFF_CAP_MS = 5_000;

/**
 * Forward the daemon's tool-catalog changes to the host, reconnecting the SSE
 * subscription whenever it drops (the daemon restarts, a socket resets) until
 * aborted. A dropped subscription is normal — the daemon is a process the user
 * can stop — so it is retried, not surfaced as an error.
 */
export async function pushToolChanges(deps: ToolChangeDeps): Promise<void> {
  const subscribe = deps.subscribe ?? defaultSubscribe;
  const sleep = deps.sleep ?? realSleep;
  const rng = deps.rng ?? Math.random;
  const now = deps.now ?? Date.now;
  const url = `${deps.mcpUrl.replace(/\/mcp$/, "")}/mcp/notifications`;
  // Decorrelated jitter: prev seeds the next window; a held-then-dropped
  // subscription resets it so a real connection reconnects fast.
  let prev = TOOLCHANGE_BACKOFF_BASE_MS;
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
    // A subscription that held at least a base interval was a real connection
    // that dropped, not a failing connect — reset so reconnect is prompt.
    if (now() - startedAt >= TOOLCHANGE_BACKOFF_BASE_MS) {
      prev = TOOLCHANGE_BACKOFF_BASE_MS;
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
  /** Injected in tests; defaults to `ensureDaemonRunning`. */
  ensure?: (deps: EnsureRunningDeps) => Promise<void>;
  /** Injected in tests; defaults to a real stdio transport. */
  transport?: Transport;
  /** Injected in tests; defaults to the real SSE subscription. */
  subscribe?: SubscribeImpl;
}

/**
 * Run the adapter: make sure a daemon exists, then serve MCP over stdio.
 *
 * The two legs are separate on purpose — `ensureDaemonRunning` deals with the
 * socket/spawn edges and `createAdapterServer` with the request handlers — so
 * each is testable alone. This function is the only place that touches the real
 * stdio transport, which is why it stays a thin composition.
 */
export async function runAdapter(deps: RunAdapterDeps = {}): Promise<void> {
  const ensure = deps.ensure ?? ensureDaemonRunning;
  // `version` is this bin's own version — pass it so a stale older daemon still
  // holding the port after an update is replaced instead of silently reused.
  await ensure({
    host: deps.host,
    port: deps.port,
    log: deps.log,
    selfVersion: deps.version,
  });

  const server = createAdapterServer(deps);
  let transport: Transport;
  if (deps.transport) {
    transport = deps.transport;
  } else {
    transport = new StdioServerTransport();
  }
  await server.connect(transport);

  // Forward the daemon's tool-catalog changes to the host so it re-fetches when
  // the panel connects or drops — no restart, no stale "no tools". Fire-and-
  // forget: the loop lives as long as the adapter does. Bound to the transport's
  // close so a host that disconnects tears the subscription down.
  const host = deps.host ?? DEFAULT_HOST;
  const port = deps.port ?? DEFAULT_PORT;
  const controller = new AbortController();
  const prevOnClose = transport.onclose;
  transport.onclose = () => {
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
 * Route the process argv to one of the three subcommand handlers.
 *
 * Extracted from `main()` so the routing decision is testable with injected
 * handlers, without spawning a daemon or connecting a transport. The default
 * (no recognised subcommand) is the adapter, which is what an MCP host spawns.
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
