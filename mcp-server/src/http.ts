/**
 * The daemon's `node:http` surface — no framework.
 *
 * The private bridge, loopback only:
 *   GET  /bridge/health  unauthenticated {name, version} — port-squatter triage
 *   POST /bridge/hello   handshake
 *   GET  /bridge/events  SSE — the server pushes work down this
 *   POST /bridge/result  the panel answers here
 *
 * Plus the public MCP transport, also loopback only:
 *   POST /mcp            JSON-RPC — tools/list + tools/call, many hosts, no session
 *
 * The `/bridge/*` half is our own channel to the browser, which is why an MCP
 * framework's built-in SSE would not have covered it. The `/mcp` half is the
 * daemon's difference from the per-host stdio server it replaces: one process
 * owns the port and serves every host that dials in.
 *
 * `node:http` rather than a framework because the whole surface is a handful of
 * routes, and this package is published for people to audit — every dependency
 * is one more thing they have to trust.
 */
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";

import {
  HEARTBEAT_INTERVAL_MS,
  isLoopbackHost,
  type BridgeDownstream,
} from "@modootoday/extension-app-mcp-core";

import type { Bridge } from "./bridge.js";
import { handleMcpRequest } from "./mcp-http.js";

/**
 * Ref-count hooks for the lifecycle owner.
 *
 * The panel's SSE stream and each in-flight `/mcp` request are the two things
 * that keep the daemon warm; the HTTP layer is where they are observable, so it
 * reports them here. All optional — a caller wiring only the bridge (the mock
 * e2e) passes nothing and pays no lifecycle cost.
 */
export interface LifecycleHooks {
  /** A connection worth keeping the daemon alive for opened (panel SSE). */
  retain?: () => void;
  /** That connection closed. */
  release?: () => void;
  /** Traffic crossed the daemon; reset the idle debounce even under load. */
  bump?: () => void;
}

export interface HttpBridgeOptions {
  bridge: Bridge;
  port: number;
  /** Must be loopback. Asserted, not assumed. */
  host?: string;
  /** Injected in tests. */
  heartbeatMs?: number;
  /**
   * How long to defer the "panel gone → catalog empty" broadcast after a stream
   * drops, so a panel RELOAD (drop-then-reconnect within ms) does not flap the
   * host's catalog empty→full. A reconnect inside this window cancels it.
   * Injected in tests; defaults below.
   */
  toolsChangedDebounceMs?: number;
  /** What /bridge/health reports. */
  identity: { name: string; version: string };
  /** Optional idle-lifecycle wiring. */
  lifecycle?: LifecycleHooks;
  /**
   * Called when a token-authorised `POST /mcp/shutdown` arrives — an updating
   * adapter asking a stale daemon to step aside so the new version can bind.
   * Production closes the server and exits here.
   */
  onShutdown?: () => void;
}

/** Max handshake body. A hello is a few hundred bytes; anything larger is noise. */
const MAX_BODY_BYTES = 64 * 1024;

/** Default catalog-drop debounce — long enough to absorb a reload, short enough to feel live. */
const DEFAULT_TOOLS_CHANGED_DEBOUNCE_MS = 600;

/** MCP bodies carry tool args (ids, keywords), larger than a hello but still small. */
const MAX_MCP_BODY_BYTES = 256 * 1024;

export interface HttpBridge {
  server: Server;
  /** Push a frame to the connected panel. Returns false if nobody is listening. */
  send: (frame: BridgeDownstream) => boolean;
  close: () => Promise<void>;
}

export function createHttpBridge(opts: HttpBridgeOptions): HttpBridge {
  const host = opts.host ?? "127.0.0.1";
  // Fail at startup rather than discovering at incident time that the bridge
  // was reachable from the LAN. This is the single check that separates us from
  // the best-known prior art in this space, which binds 0.0.0.0 with no auth.
  if (!isLoopbackHost(host)) {
    throw new Error(`Refusing to bind ${host}: the bridge is loopback-only.`);
  }

  const lifecycle = opts.lifecycle;
  // The one live panel stream. Identity IS the session key: a superseded socket
  // (a panel reload installed a newer stream) is never `=== sse`, so its late
  // close can no longer tear down the fresh session — the bug that produced the
  // 409→403 bounce and a 30s-hung call on a dead socket.
  let sse: ServerResponse | null = null;
  let heartbeat: NodeJS.Timeout | null = null;
  let toolsDropTimer: NodeJS.Timeout | null = null;
  const debounceMs =
    opts.toolsChangedDebounceMs ?? DEFAULT_TOOLS_CHANGED_DEBOUNCE_MS;

  // Adapters (one per MCP host) subscribe here so the daemon can tell them the
  // tool catalog changed — the panel came or went — and they re-fetch on the
  // host's behalf. Without this a host caches the list at connect time (empty if
  // the panel was not up yet) and never refreshes until it is restarted.
  const toolSubscribers = new Set<ServerResponse>();

  const notifyToolsChanged = (): void => {
    for (const sub of toolSubscribers) {
      if (sub.writableEnded) {
        toolSubscribers.delete(sub);
        continue;
      }
      try {
        sub.write(`data: ${JSON.stringify({ type: "tools_changed" })}\n\n`);
      } catch {
        toolSubscribers.delete(sub);
      }
    }
  };

  const cancelToolsDrop = (): void => {
    if (toolsDropTimer) {
      clearTimeout(toolsDropTimer);
      toolsDropTimer = null;
    }
  };

  // Defer the "catalog emptied" broadcast: a panel reload reconnects within ms
  // and cancels it, so the host never sees the catalog blink empty→full. Only
  // the broadcast is deferred — the session teardown and rejectAll happen
  // immediately (an in-flight call cannot land on a gone panel), so nothing is
  // held open and the invariant is untouched.
  const scheduleToolsDrop = (): void => {
    cancelToolsDrop();
    toolsDropTimer = setTimeout(() => {
      toolsDropTimer = null;
      notifyToolsChanged();
    }, debounceMs);
    toolsDropTimer.unref?.();
  };

  const send = (frame: BridgeDownstream): boolean => {
    if (!sse || sse.writableEnded) return false;
    sse.write(`data: ${JSON.stringify(frame)}\n\n`);
    return true;
  };

  /** Tear down the current stream's timer + reference, without touching the session. */
  const teardownSseSocket = (): void => {
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
    sse = null;
  };

  // A stream's socket closed. Only the socket that STILL owns the live stream
  // may end the session — a superseded socket closing late must be a no-op, or
  // it would wipe the session a newer panel just installed.
  const onSseClose = (res: ServerResponse): void => {
    if (res !== sse) return;
    teardownSseSocket();
    opts.bridge.disconnect();
    // The panel is what we most want to keep the daemon warm for; its going
    // away is what starts the idle countdown.
    lifecycle?.release?.();
    // Tell every host the catalog emptied — but debounced, so a reload that
    // reconnects within the window never surfaces the empty blip.
    scheduleToolsDrop();
  };

  // A new handshake succeeded while an old stream is still open (a panel
  // reload). Retire the old socket now, WITHOUT running onSseClose's disconnect
  // — the bridge already superseded the session in the handshake — so the old
  // socket's late `close` event finds `res !== sse` and no-ops.
  const retireStaleSocket = (): void => {
    if (!sse) return;
    const stale = sse;
    teardownSseSocket();
    try {
      stale.end();
    } catch {
      /* already torn down */
    }
  };

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://${host}`);
    const origin = req.headers.origin;

    // The public MCP transport. Loopback reach is the gate; a stateless POST
    // carries its own id, so many hosts share this one route with no session
    // map. Body read here (with its own cap) so `/mcp` obeys the same
    // read-then-delegate discipline the bridge routes do.
    if (req.method === "POST" && url.pathname === "/mcp") {
      // Any /mcp traffic is activity — reset the idle debounce so a burst of
      // adapters starting at once never trips an idle-exit mid-call.
      lifecycle?.bump?.();
      void readJson(req, MAX_MCP_BODY_BYTES)
        .then((body) => handleMcpRequest(opts.bridge, body, req.headers.accept))
        .catch(() =>
          // Unparseable or oversized body still owes a JSON-RPC answer, not a
          // dropped socket; route a null body through as method-not-found.
          handleMcpRequest(opts.bridge, null, req.headers.accept),
        )
        .then((out) => {
          res.writeHead(out.status, out.headers);
          res.end(out.body);
        });
      return;
    }

    // Deliberately unauthenticated: its one job is telling "our server, just
    // old" apart from "some other program squatting on the port" — a caller
    // who cannot get past the handshake still deserves that distinction,
    // because the panel renders a different repair card for each. It reveals
    // name and version, nothing else; the port's existence is already
    // observable to any local process.
    if (req.method === "GET" && url.pathname === "/bridge/health") {
      json(res, 200, {
        name: opts.identity.name,
        version: opts.identity.version,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/bridge/hello") {
      void readJson(req, MAX_BODY_BYTES)
        .then((body) => {
          const out = opts.bridge.handshake(body, origin);
          // A successful handshake means a panel now owns the bridge. If an old
          // stream is still open (the usual cause: a reload), retire it here so
          // its late close cannot wipe this fresh session and the new panel's
          // /bridge/events is not refused with 409.
          if (out.t === "hello_ack") retireStaleSocket();
          // 403 on refusal so a prober cannot tell a wrong token from a wrong
          // origin by status alone; the body carries the reason, and only a
          // caller that got this far can read it.
          json(res, out.t === "hello_ack" ? 200 : 403, out);
        })
        .catch(() =>
          json(res, 400, {
            t: "hello_nack",
            reason: "unauthorized",
            supported: [],
            message: "Bad request.",
          }),
        );
      return;
    }

    if (req.method === "GET" && url.pathname === "/bridge/events") {
      if (!opts.bridge.connected) {
        json(res, 403, { error: "handshake required" });
        return;
      }
      // A second stream would race the first for the same replies.
      if (sse) {
        json(res, 409, { error: "already connected" });
        return;
      }
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
        // Nagle would hold small frames back; a bridge frame is small by nature.
        "x-accel-buffering": "no",
      });
      sse = res;
      // The panel is now live — the connection the daemon exists to keep warm.
      lifecycle?.retain?.();
      // A reconnect within the debounce window cancels the pending "catalog
      // emptied" broadcast, so a reload never surfaces the empty blip.
      cancelToolsDrop();
      // The catalog just became available — tell every host to re-fetch, so a
      // host that connected before the panel came up stops showing "no tools".
      notifyToolsChanged();
      // The heartbeat is what keeps the extension's service worker alive while
      // the stream is idle — without it, MV3 evicts the worker holding this
      // connection and the panel silently stops answering.
      heartbeat = setInterval(() => {
        send({ t: "hb", at: Date.now() });
      }, opts.heartbeatMs ?? HEARTBEAT_INTERVAL_MS);
      heartbeat.unref?.();
      // Session-scoped: only this exact socket closing ends this session.
      req.on("close", () => onSseClose(res));
      return;
    }

    // A token-authorised request from an updating adapter: a newer version has
    // been installed and wants to replace this one, but the singleton bind means
    // the new daemon cannot start while this one holds the port. So the new
    // adapter asks this one to step aside. The token gates it (a random local
    // process should not be able to kill the daemon); loopback gates the rest.
    if (req.method === "POST" && url.pathname === "/mcp/shutdown") {
      void readJson(req, MAX_BODY_BYTES)
        .then((body) => {
          const token = (body as { token?: unknown } | null)?.token;
          if (
            !opts.bridge.verifyToken(typeof token === "string" ? token : "")
          ) {
            json(res, 403, { error: "unauthorized" });
            return;
          }
          json(res, 200, { ok: true });
          // Answer first, then step down — the caller polls the port to know we
          // are gone before it spawns the replacement.
          opts.onShutdown?.();
        })
        .catch(() => json(res, 400, { error: "bad request" }));
      return;
    }

    // Adapter subscription for tool-catalog changes. An adapter opens this once
    // and holds it; the daemon writes a `tools_changed` event whenever the panel
    // connects or drops. The immediate event on subscribe covers the common
    // race: the adapter (and its host) connected before the panel was up, so its
    // cached tool list is already stale and must be refreshed at once.
    if (req.method === "GET" && url.pathname === "/mcp/notifications") {
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
        "x-accel-buffering": "no",
      });
      toolSubscribers.add(res);
      // A subscribed adapter means a host is connected and waiting — worth
      // keeping the daemon warm for, exactly like the panel stream.
      lifecycle?.retain?.();
      res.write(`data: ${JSON.stringify({ type: "tools_changed" })}\n\n`);
      const subHb = setInterval(() => {
        if (!res.writableEnded) res.write(`: hb\n\n`);
      }, opts.heartbeatMs ?? HEARTBEAT_INTERVAL_MS);
      subHb.unref?.();
      req.on("close", () => {
        clearInterval(subHb);
        toolSubscribers.delete(res);
        lifecycle?.release?.();
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/bridge/result") {
      if (!opts.bridge.connected) {
        json(res, 403, { error: "handshake required" });
        return;
      }
      void readJson(req, MAX_BODY_BYTES)
        .then((body) => {
          opts.bridge.receive(body);
          json(res, 202, { ok: true });
        })
        .catch(() => json(res, 400, { error: "bad request" }));
      return;
    }

    json(res, 404, { error: "not found" });
  });

  return {
    server,
    send,
    close: () =>
      new Promise<void>((resolve) => {
        if (heartbeat) clearInterval(heartbeat);
        cancelToolsDrop();
        sse?.end();
        for (const sub of toolSubscribers) sub.end();
        toolSubscribers.clear();
        server.close(() => resolve());
        // `server.close` only stops new connections and waits for existing ones
        // to end on their own — a host's pooled keep-alive socket would wedge it
        // (and the idle-exit that awaits it) open indefinitely. close() is only
        // ever called on a terminal path (idle reclaim, SIGINT/SIGTERM), so
        // forcibly ending sockets is correct: a stateless host just reconnects.
        server.closeAllConnections?.();
      }),
  };
}

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json" });
  res.end(payload);
}

/** Read a JSON body, refusing anything oversized before it is buffered. */
function readJson(req: IncomingMessage, maxBytes: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
    req.on("error", reject);
  });
}
