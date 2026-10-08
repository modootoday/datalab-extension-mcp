/**
 * The thin stdio adapter — a stdio-to-daemon proxy that owns nothing.
 *
 * An MCP host spawns this bin; it speaks MCP over stdio and forwards its two
 * methods to the background daemon over loopback HTTP. It binds no port and
 * holds no bridge, so many adapters (one per host) share one daemon. Every
 * edge — readiness probe, child spawn, HTTP fetch — is injectable, which is
 * what makes the proxy testable without a real socket or daemon.
 */
import { randomUUID } from "node:crypto";

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
  isOlderVersion,
  isOurConnector,
  isSemver,
  staticDiscoveryCatalog,
  REQUEST_DEADLINE_MS,
} from "@modootoday/datalab-extension-app-mcp-core";
import {
  DEFAULT_HOST,
  DEFAULT_PORT,
  mediaToolDescriptors,
  tryConnect,
  spawnDaemon,
  readTakeoverSecret,
  killPortOwner,
} from "@modootoday/datalab-extension-app-mcp-server";

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
 * Asked of OUR gateway, never of npm directly. A floating `@latest` in the
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
 * Anything printed must go to stderr. stdout is the MCP transport, so a
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

/**
 * One start-up milestone on stderr, timed from process start, so a slow start
 * can be split into its parts from the host's own log.
 */
export function startupMark(label: string, log: (m: string) => void): void {
  log(`startup: ${label} at ${String(Math.round(performance.now()))}ms`);
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
/**
 * The pairing credential, when this adapter was configured with one.
 *
 * Sent, never required. The daemon on the other end may be older than this
 * build and does not read it, and it is shared by every host on the machine —
 * so an adapter cannot decide for the others that a credential is mandatory.
 * Sending it is what makes deciding possible later: until every adapter does,
 * a gate would lock out the ones that never update.
 */
function credentialHeader(): Record<string, string> {
  const token = process.env["DATALAB_MCP_TOKEN"]?.trim();
  return token ? { authorization: `Bearer ${token}` } : {};
}

/**
 * Which adapter is calling. One process per host, per this file's own header,
 * so a process id is a host id.
 *
 * Counted, never trusted. The daemon cannot tell two hosts apart today — the
 * pairing credential is shared by every one of them — so nothing knows whether
 * two ever run at once, and the editor lease that is supposed to serialize them
 * gives them all the same owner key. This is what makes that answerable.
 * Random per process and never persisted: a restart is a new session, and a
 * stable id would be a fingerprint for no gain.
 */
const CLIENT_ID = randomUUID();
export const CLIENT_ID_HEADER = "x-datalab-mcp-client";

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
  // A local request still needs a ceiling: a daemon that stops answering
  // would otherwise leave this await outstanding forever, and the host waits
  // with it — no answer, no error, no turn.
  const res = await fetchImpl(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...credentialHeader(),
      [CLIENT_ID_HEADER]: CLIENT_ID,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(POST_TIMEOUT_MS),
  });
  const text = await res.text();
  return JSON.parse(text) as JsonRpcResponse;
}

/** True when semver `a` is strictly older than `b` (plain x.y.z; no pre-release). */
/**
 * Re-exported rather than reimplemented. The local copy compared with parseInt,
 * which reads "1.8.2-rc" as 1 — leniency that reaches a branch able to end
 * another process, so the shared strict answer is the safer one here.
 */
export { isOlderVersion };

/** GET /bridge/health and return the daemon's version, or null if unreadable. */
async function defaultReadVersion(base: string): Promise<string | null> {
  try {
    const res = await (globalThis.fetch as typeof fetch)(
      `${base}/bridge/health`,
    );
    const body = (await res.json()) as { version?: unknown };
    // A version this build cannot order is not one to reason about: the
    // branches below decide whether to retire the process holding the port.
    return isOurConnector(body) && isSemver(body.version) ? body.version : null;
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

async function defaultCheckAuthority(
  base: string,
  token: string,
): Promise<boolean> {
  try {
    const res = await (globalThis.fetch as typeof fetch)(
      `${base}/mcp/authority`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      },
    );
    return res.status === 204;
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
   * Reads the running daemon's takeover secret from disk. Injected in tests;
   * defaults to the real file.
   */
  readTakeover?: () => string | null;
  /**
   * Ends the process holding the port. Injected in tests; defaults to the real
   * one. Never reached before the holder is confirmed to be our connector.
   */
  killOwner?: (port: number) => boolean;
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
  /** Injected in tests; defaults to the authenticated authority probe. */
  checkAuthority?: (base: string, token: string) => Promise<boolean>;
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
  const checkAuthority = deps.checkAuthority ?? defaultCheckAuthority;
  const readTakeover = deps.readTakeover ?? (() => readTakeoverSecret());
  const killOwner = deps.killOwner ?? ((p: number) => killPortOwner(p));

  /** Stand the holder down with the file only a local user can read. */
  const shutdownWithTakeover = async (): Promise<boolean> => {
    const secret = readTakeover();
    return secret !== null && (await shutdown(base, secret));
  };

  /**
   * Take the port back from a holder that answers to neither credential.
   *
   * Reached only once readVersion has identified it as our connector, so the
   * process ended is always ours. A daemon nobody on this machine can address
   * is serving nobody correctly, and leaving it holding the port keeps at
   * least one host down for as long as it lives — while any host that needed
   * it respawns it on the next call (reviveAndRetry).
   */
  const seizePort = async (): Promise<boolean> => {
    if (!killOwner(port)) return false;
    log(`ending the connector that holds port ${String(port)}`);
    await waitForPortRelease();
    await spawnAndWait();
    return true;
  };

  /** Poll until the retiring daemon lets go of the port. */
  const waitForPortRelease = async (): Promise<void> => {
    for (let i = 0; i < attempts; i += 1) {
      const socket = await connect(host, port, PROBE_TIMEOUT_MS);
      if (!socket) break;
      socket.destroy();
      await sleep(intervalMs);
    }
  };

  // Spawn this bin as serve, which runs the inlined daemon rather than
  // another adapter — otherwise the spawn recurses without bound.
  const spawnAndWait = async (): Promise<void> => {
    spawn(daemonEntry, ["serve"]);
    startupMark("connector service started", log);
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
  if (!running) {
    throw new Error(
      `port ${String(port)} is occupied by something other than the DataLab connector`,
    );
  }
  if (!isOlderVersion(running, selfVersion)) {
    if (await checkAuthority(base, token)) return;
    // Same version, different token. Nothing here can register with it, stop
    // it, or wait it out: idle-exit needs zero connections and this host is
    // one. The takeover file is the way through — reading it proves local
    // access, which is what actually distinguishes us from a browser.
    if (await shutdownWithTakeover()) {
      log("retiring the connector that holds this port with a different token");
      await waitForPortRelease();
      await spawnAndWait();
      return;
    }
    if (await seizePort()) return;
    throw new Error(
      `connector authority conflict on port ${String(port)}; a connector started with a different DataLab workbench token holds it. ` +
        `Quit every AI app so it idles out (about 5 minutes at zero connections), then start this one again.`,
    );
  }

  log(`updating the connector: replacing ${running} with ${selfVersion}`);
  // The token first, which is the ordinary case, then the takeover file. An
  // update lands here after the adapter re-executed itself as the canonical
  // build, so refusing on a token mismatch would strand the promotion the
  // watcher just performed — the daemon is ours and older, and standing it
  // down is the whole point of this branch.
  const accepted =
    (await shutdown(base, token)) || (await shutdownWithTakeover());
  if (!accepted && (await seizePort())) return;
  if (!accepted) {
    // Neither credential worked and the port could not be taken back — a
    // platform with no kill command, or a process that survived it.
    log(
      "the running connector did not step aside; restart it (or wait for it to idle out) to pick up the new version",
    );
    throw new Error(
      `connector authority conflict on port ${String(port)}; the running connector did not accept this workbench token`,
    );
  }
  await waitForPortRelease();
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
  /** Settles once the start-up daemon check is done; calls wait on it, the handshake does not. */
  ready?: Promise<void>;
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

  let daemonReady = deps.ready === undefined;
  let servedEarly = false;
  void deps.ready?.then(() => {
    daemonReady = true;
    startupMark("connector service ready", log);
    // The host holds the façade it got early; tell it the daemon can answer now.
    if (servedEarly) {
      void server
        .notification({ method: "notifications/tools/list_changed" })
        .catch(() => {});
    }
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    deps.onActivity?.(1);
    try {
      return await handleToolList();
    } finally {
      deps.onActivity?.(-1);
    }
  });

  async function handleToolList(): Promise<Record<string, unknown>> {
    // Until the start-up daemon check settles, the answer is the façade: a
    // fresh daemon has no panel attached yet and would return the same list,
    // and a revive racing the check would spawn a second daemon.
    if (!daemonReady) {
      servedEarly = true;
      startupMark("tools/list answered from the façade", log);
      return {
        tools: [...staticDiscoveryCatalog(), ...mediaToolDescriptors()],
      };
    }
    let resp: JsonRpcResponse;
    try {
      resp = await postMcp(fetchImpl, mcpUrl, "tools/list");
    } catch (first) {
      // The daemon idle-exits by design, so a host that spent a while
      // thinking arrives here with nothing listening — the same situation a
      // tool call handles by bringing it back. Asking for the catalog was
      // answering "there is no connector" instead, which is the one answer a
      // host cannot recover from: most cache the first list they receive.
      log(`tools/list found no connector; restarting it and retrying`);
      try {
        await revive({
          host: deps.host,
          port: deps.port,
          log,
          selfVersion: deps.version,
        });
        resp = await postMcp(fetchImpl, mcpUrl, "tools/list");
      } catch (second) {
        // The façade rather than a throw. These names are how anything is
        // reached at all, and a host left holding none of them has no way to
        // ask again for the rest of its session. Calling one while the
        // connector is down still says so, with somewhere to go.
        //
        // The staging names ride along. A caching host keeps whatever it is
        // handed, so a short list costs it those tools for the session just as
        // surely as an empty one costs it every tool — and the daemon's own
        // offline answer carries them for the same reason.
        log(`tools/list serving the offline façade: ${describeError(second)}`);
        return {
          tools: [...staticDiscoveryCatalog(), ...mediaToolDescriptors()],
        };
      }
    }
    if (resp.error) {
      // A daemon that answered is a daemon that is running, so this is a real
      // fault and worth surfacing rather than papering over with the façade.
      log(`tools/list error: ${resp.error.message ?? "unknown"}`);
      throw new McpError(
        ErrorCode.InternalError,
        resp.error.message ?? "The connector reported an error.",
      );
    }
    return { tools: resp.result?.tools ?? [] };
  }

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
    await deps.ready;
    let resp: JsonRpcResponse;
    try {
      resp = await postMcp(fetchImpl, mcpUrl, "tools/call", {
        name,
        arguments: args ?? {},
      });
    } catch (first) {
      // The daemon idle-exits by design, and a host that spent longer than
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
 * Consecutive connect failures before the daemon is presumed gone and
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
  /** Injected in tests; defaults to {@link updateInstalledCopy}. */
  update?: () => Promise<UpdateOutcome>;
  /** Injected in tests; defaults to `ensureDaemonRunning`. */
  ensure?: (deps: EnsureRunningDeps) => Promise<void>;
  /** Injected in tests; defaults to a real stdio transport. */
  transport?: Transport;
  /** Injected in tests; defaults to the real SSE subscription. */
  subscribe?: SubscribeImpl;
  /** false pins this build — `--no-self-update`. Default promotes to canonical. */
  selfUpdate?: boolean;
  /** Injected in tests; the host's end of the session. Defaults to process.stdin. */
  stdin?: NodeJS.EventEmitter;
  /** Injected in tests; defaults to process.exit. */
  exit?: (code: number) => void;
}

/** Time for the subscription teardown to flush before the process ends. */
export const SESSION_EXIT_GRACE_MS = 200;

/**
 * Run the adapter: serve MCP over stdio at once while making sure a daemon
 * exists. The two legs stay separate so each is testable alone, and this is the
 * only place that touches the real stdio transport.
 */
/** How this process was started, which decides what an update may do. */
export type LaunchKind = "npx" | "global" | "other";

export function launchKindOf(entry: string | undefined): LaunchKind {
  if (!entry) return "other";
  const path = entry.replace(/\\/g, "/");
  if (path.includes("/_npx/")) return "npx";
  if (path.endsWith(`/node_modules/${PACKAGE_NAME}/dist/cli.js`)) {
    return "global";
  }
  return "other";
}

export interface UpdateDeps {
  resolve?: typeof canonicalVersion;
  /** Puts exactly this version in the global install; true once it is there. */
  install?: (version: string) => Promise<boolean>;
  /** Points hosts that still use the package runner at the global install. */
  relink?: (version: string) => Promise<void>;
  launch?: LaunchKind;
}

export type UpdateOutcome = "none" | "installed" | "migrated" | "failed";

/**
 * Keeps the global install current without touching this session: a newer
 * canonical build is installed for the next start, and a session started by
 * the package runner moves its hosts onto the global install. The version
 * comes from our gateway, is plain semver, and never goes backwards.
 */
export async function updateInstalledCopy(
  selfVersion: string | undefined,
  log: (m: string) => void,
  deps: UpdateDeps = {},
): Promise<UpdateOutcome> {
  const launch = deps.launch ?? launchKindOf(process.argv[1]);
  if (!selfVersion || launch === "other") return "none";
  const target = await (deps.resolve ?? canonicalVersion)();
  const newer =
    target !== null && isOlderVersion(selfVersion, target) ? target : null;
  if (launch === "global" && newer === null) return "none";

  const version = newer ?? selfVersion;
  const install = deps.install ?? defaultInstall;
  if (!(await install(version))) {
    log(`could not install connector ${version}; this build keeps serving`);
    return "failed";
  }
  if (launch === "global") {
    log(`connector ${version} is installed; the next start uses it`);
    return "installed";
  }
  log(`connector ${version} is installed; moving host entries onto it`);
  await (deps.relink ?? defaultRelink)(version);
  return "migrated";
}

/** Installer I/O with every line on stderr: stdout is the MCP transport. */
async function quietInstallerIo() {
  const installer =
    await import("@modootoday/datalab-extension-app-mcp-installer");
  const io = installer.createNodeIo();
  io.out = (line: string) => defaultLog(line);
  return { installer, io };
}

async function defaultInstall(version: string): Promise<boolean> {
  const { installer, io } = await quietInstallerIo();
  const present = await installer.resolveGlobalLaunch(io, version);
  if (present.ok) return true;
  const outcome = await installer.installGlobally(io, version, {
    inheritStdio: false,
  });
  return outcome.ok;
}

async function defaultRelink(version: string): Promise<void> {
  const { installer, io } = await quietInstallerIo();
  const resolved = await installer.resolveGlobalLaunch(io, version);
  if (!resolved.ok) {
    defaultLog(
      `relink skipped: installed copy not usable (${resolved.reason})`,
    );
    return;
  }
  const env = process.env;
  const opts = {
    version,
    token: env["DATALAB_MCP_TOKEN"]?.trim() ?? "",
    extensionId: env["DATALAB_MCP_EXTENSION_ID"]?.trim() ?? "",
    port: env["DATALAB_MCP_PORT"]?.trim() || undefined,
  };
  // The same gate the installer applies before anything reaches a shell.
  if (installer.validateInstallOptions(opts) !== null) {
    defaultLog("relink skipped: the session's pairing values did not validate");
    return;
  }
  const results = await installer.relinkInstalledHosts(io, {
    ...opts,
    launch: resolved.launch,
  });
  if (results.length === 0) {
    defaultLog("relink: no host entry used the package runner");
  }
  for (const r of results) {
    defaultLog(`relink ${r.hostId}: ${r.status} (${r.message})`);
  }
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
  const ensure = deps.ensure ?? ensureDaemonRunning;
  const log = deps.log ?? defaultLog;
  startupMark("adapter loaded", log);
  // Not awaited: hosts give the handshake a short start-up budget, and the
  // daemon check can take seconds. Passing our version lets a stale older
  // daemon still holding the port be replaced instead of silently reused.
  const ready = ensure({
    host: deps.host,
    port: deps.port,
    log: deps.log,
    selfVersion: deps.version,
  }).catch((err: unknown) => {
    log(`could not start the connector service: ${describeError(err)}`);
  });

  // Updates never sit in front of the handshake: a host gives start-up a short
  // budget and the version lookup is a network call. The check runs after the
  // connect and again on an interval, only while no call is in flight, and
  // stops once this process has installed or moved anything.
  const flight = { count: 0 };
  const watchMs = deps.watchIntervalMs ?? DEFAULT_WATCH_MS;
  const server = createAdapterServer({
    ...deps,
    ready,
    onActivity: countRequests(flight, deps.onActivity),
  });
  let updating = false;
  let watch: ReturnType<typeof setInterval> | null = null;
  const checkForUpdate = (): void => {
    if (updating || flight.count > 0) return;
    updating = true;
    const run =
      deps.update ??
      (() =>
        updateInstalledCopy(deps.version, deps.log ?? defaultLog, {
          resolve: deps.canonical,
        }));
    void run()
      .then((outcome) => {
        if (outcome !== "none" && watch) clearInterval(watch);
      })
      .catch((err: unknown) => {
        log(`update check failed: ${describeError(err)}`);
      })
      .finally(() => {
        updating = false;
      });
  };
  if (deps.selfUpdate !== false) {
    watch = setInterval(checkForUpdate, watchMs);
    // Never hold the process open on our account.
    watch.unref?.();
  }
  let transport: Transport;
  if (deps.transport) {
    transport = deps.transport;
  } else {
    transport = new StdioServerTransport();
  }
  await server.connect(transport);
  startupMark("transport connected", log);
  if (deps.selfUpdate !== false) checkForUpdate();

  // Forward catalog changes so the host re-fetches when the panel connects or
  // drops. Fire-and-forget, bound to the transport's close so a host that
  // disconnects tears the subscription down with it.
  const host = deps.host ?? DEFAULT_HOST;
  const port = deps.port ?? DEFAULT_PORT;
  const controller = new AbortController();
  const prevOnClose = transport.onclose;
  const exit =
    deps.exit ?? (deps.transport ? null : process.exit.bind(process));
  transport.onclose = () => {
    if (watch) clearInterval(watch);
    controller.abort();
    prevOnClose?.();
    // The session is over once the host is gone. Exiting releases the daemon
    // subscription, so the daemon can idle out when no host remains.
    if (exit) setTimeout(exit, SESSION_EXIT_GRACE_MS, 0);
  };
  // The stdio transport reads data but does not report the host closing the
  // pipe, so the end of stdin is what ends the session.
  const stdin = deps.stdin ?? (deps.transport ? null : process.stdin);
  if (stdin) {
    const endSession = (): void => {
      void transport.close().catch(() => {});
    };
    stdin.once("end", endSession);
    stdin.once("close", endSession);
  }
  // After the start-up check: the subscription revives a missing daemon too.
  void ready.then(() =>
    pushToolChanges({
      mcpUrl: `http://${host}:${port}/mcp`,
      notifyHost: () =>
        server
          .notification({ method: "notifications/tools/list_changed" })
          .catch(() => {}),
      subscribe: deps.subscribe,
      log: deps.log,
      signal: controller.signal,
    }),
  );
}

export interface CliHandlers {
  install: (
    sub: "install" | "uninstall",
    argv: readonly string[],
  ) => Promise<void>;
  serve: () => void;
  adapter: () => Promise<void>;
  /**
   * A word we do not know. Injected so the refusal is testable without a
   * process; production prints usage and exits non-zero.
   */
  unknown: (sub: string) => void;
}

/**
 * Route argv to one of the subcommand handlers. Kept out of the entry so the
 * routing is testable with injected handlers. The default, with no subcommand
 * at all, is the adapter — what an MCP host spawns.
 *
 * A word we do not recognise is refused rather than treated as the default.
 * Falling through would answer a typo by speaking the MCP protocol at a person's
 * terminal: silent, since diagnostics go to stderr, and it would start a
 * connector and schedule its own replacement on the way.
 *
 * Flags still fall through. Hosts pass those, and only those — every config
 * this installer writes is `["-y", "<spec>"]`, so nothing it produces reaches
 * the refusal.
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
  if (sub !== undefined && !sub.startsWith("-")) {
    handlers.unknown(sub);
    return;
  }
  await handlers.adapter();
}
