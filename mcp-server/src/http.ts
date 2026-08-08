/**
 * The daemon's node:http surface — loopback only, no framework.
 *
 * The bridge routes are our own channel to the browser, which an MCP
 * framework's built-in SSE would not have covered; the MCP route is stateless
 * JSON-RPC that every host shares on one port. Framework-free because this
 * package is published to be audited, and a dependency is one more thing to
 * trust.
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
import { openLocalImage } from "./local-file.js";
import type { MediaStage } from "./media-stage.js";

/**
 * Ref-count hooks for the lifecycle owner. The panel stream and each in-flight
 * MCP request are what keep the daemon warm, and the HTTP layer is where they
 * are observable. All optional — a caller wiring only the bridge passes none.
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
   * How long to defer the "catalog emptied" broadcast after a stream drops, so
   * a panel reload (drop then reconnect within milliseconds) does not flap the
   * host's catalog. A reconnect inside this window cancels it.
   */
  toolsChangedDebounceMs?: number;
  /** What /bridge/health reports. */
  identity: { name: string; version: string };
  /** Optional idle-lifecycle wiring. */
  lifecycle?: LifecycleHooks;
  /**
   * Where staged binaries land. Absent means the daemon accepts no uploads —
   * the endpoint 404s rather than inventing a root, so a build that never wired
   * staging cannot be talked into writing files.
   */
  mediaStage?: MediaStage;
  /**
   * Diagnostics sink. Shares the daemon's, so anything written here reaches the
   * connector log the user can read.
   */
  log?: (message: string) => void;
  /**
   * Called when a token-authorised shutdown request arrives — an updating
   * adapter asking a stale daemon to step aside so the new version can bind.
   */
  onShutdown?: () => void;
}

/** Max handshake body. A hello is a few hundred bytes; anything larger is noise. */
const MAX_BODY_BYTES = 64 * 1024;

/** Default catalog-drop debounce — long enough to absorb a reload, short enough to feel live. */
const DEFAULT_TOOLS_CHANGED_DEBOUNCE_MS = 600;

/** MCP bodies carry tool args (ids, keywords), larger than a hello but still small. */
const MAX_MCP_BODY_BYTES = 256 * 1024;

/**
 * Max body on the route the extension answers through — sized for what it
 * carries: the whole tool catalog and every tool result.
 *
 * 🔴 An over-cap reply is rejected whole and its request then waits out the
 * deadline, which reads from outside as a slow tool. The catalog must be
 * measured against this number, never assumed to fit under it.
 */
const MAX_RESULT_BODY_BYTES = 4 * 1024 * 1024;

export interface HttpBridge {
  server: Server;
  /** Push a frame to the connected panel. Returns false if nobody is listening. */
  send: (frame: BridgeDownstream) => boolean;
  close: () => Promise<void>;
}

export function createHttpBridge(opts: HttpBridgeOptions): HttpBridge {
  const host = opts.host ?? "127.0.0.1";
  // 🔴 Fail at startup rather than discover from the LAN at incident time.
  if (!isLoopbackHost(host)) {
    throw new Error(`Refusing to bind ${host}: the bridge is loopback-only.`);
  }

  const lifecycle = opts.lifecycle;
  // 🔴 The one live panel stream, where socket identity IS the session key: a
  // superseded socket never matches the live one, so its late close cannot tear down
  // the session a newer panel just installed.
  let sse: ServerResponse | null = null;
  let heartbeat: NodeJS.Timeout | null = null;
  let toolsDropTimer: NodeJS.Timeout | null = null;
  const debounceMs =
    opts.toolsChangedDebounceMs ?? DEFAULT_TOOLS_CHANGED_DEBOUNCE_MS;

  // Adapters subscribe here so the daemon can tell them the catalog changed and
  // they re-fetch for their host. Without it a host caches the list at connect
  // time — empty if the panel was not up yet — until it is restarted.
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

  // 🔴 Only the broadcast is deferred, so a panel reload cancels it before the
  // host sees the catalog blink empty. Session teardown still happens at once —
  // an in-flight call must never land on a panel that is gone.
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

  // 🔴 Only the socket that still owns the live stream may end the session; a
  // superseded socket closing late must be a no-op.
  const onSseClose = (res: ServerResponse): void => {
    if (res !== sse) return;
    teardownSseSocket();
    opts.bridge.disconnect();
    // The panel is the connection the daemon stays warm for, so its going away
    // starts the idle countdown.
    lifecycle?.release?.();
    scheduleToolsDrop();
  };

  // A new handshake landed while an old stream is still open (a panel reload).
  // Retire the old socket WITHOUT onSseClose's disconnect — the bridge already
  // superseded the session — so its late close finds no match and no-ops.
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
    // carries its own id, so many hosts share this route with no session map.
    if (req.method === "POST" && url.pathname === "/mcp") {
      // Any traffic here is activity — reset the idle debounce so a burst of
      // adapters starting at once never trips an idle-exit mid-call.
      lifecycle?.bump?.();
      void readJson(req, MAX_MCP_BODY_BYTES)
        .then((body) =>
          handleMcpRequest(
            opts.bridge,
            body,
            req.headers.accept,
            opts.mediaStage,
          ),
        )
        .catch(() =>
          // An unparseable or oversized body still owes a JSON-RPC answer, not
          // a dropped socket; a null body routes through as method-not-found.
          handleMcpRequest(
            opts.bridge,
            null,
            req.headers.accept,
            opts.mediaStage,
          ),
        )
        .then((out) => {
          writeSafely(res, out.status, out.headers, out.body);
        })
        .catch(() => {
          // 🔴 A caller that walked away leaves nothing to report back, but an
          // unhandled rejection here would end a process every other host is
          // sharing.
        });
      return;
    }

    // Deliberately open: its one job is telling "our server, just old" apart
    // from "another program holding the port", and the panel renders a
    // different repair card for each. It reveals name and version only.
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
          // A panel now owns the bridge. Retire any still-open stream here so
          // its late close cannot wipe this fresh session, and so the new
          // panel's own stream is not refused as a duplicate.
          if (out.t === "hello_ack") retireStaleSocket();
          // 🔴 One status for every refusal, so a prober cannot tell a wrong
          // token from a wrong origin by status alone.
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
        // Buffering would hold small frames back, and a bridge frame is small
        // by nature.
        "x-accel-buffering": "no",
      });
      sse = res;
      // The panel is now live — the connection the daemon exists to keep warm.
      lifecycle?.retain?.();
      cancelToolsDrop();
      // The catalog just became available, so every host is told to re-fetch;
      // one that connected before the panel came up stops showing no tools.
      notifyToolsChanged();
      // 🔴 The heartbeat keeps the extension's service worker alive while the
      // stream is idle; without it the worker is evicted and the panel
      // silently stops answering.
      heartbeat = setInterval(() => {
        send({ t: "hb", at: Date.now() });
      }, opts.heartbeatMs ?? HEARTBEAT_INTERVAL_MS);
      heartbeat.unref?.();
      // Session-scoped: only this exact socket closing ends this session.
      req.on("close", () => onSseClose(res));
      return;
    }

    // An updating adapter asking this daemon to step aside: the singleton bind
    // means a newer version cannot start while this one holds the port. 🔴 The
    // token gates it, so no other local process can stop the daemon.
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
          // are gone before spawning the replacement.
          opts.onShutdown?.();
        })
        .catch(() => json(res, 400, { error: "bad request" }));
      return;
    }

    // Where the extension reads one local image: a browser cannot open local
    // files, and a photo does not fit in a handshake-sized frame.
    //
    // 🔴 The pairing token is required — loopback alone is not enough for a
    // route that opens files. Consent is collected by the extension first.
    if (req.method === "POST" && url.pathname === "/bridge/file") {
      void readJson(req, MAX_BODY_BYTES)
        .then(async (body) => {
          const b = body as { token?: unknown; path?: unknown } | null;
          if (
            !opts.bridge.verifyToken(
              typeof b?.token === "string" ? b.token : "",
            )
          ) {
            json(res, 403, { error: "unauthorized" });
            return;
          }
          const out = await openLocalImage(
            typeof b?.path === "string" ? b.path : "",
          );
          if (!out.ok) {
            json(res, 400, { error: out.reason, message: out.message });
            return;
          }
          res.writeHead(200, {
            "content-type": out.contentType,
            "content-length": String(out.byteLength),
            // The extension shows this in its confirmation, so the user knows
            // which file is about to be used.
            "x-file-name": encodeURIComponent(out.fileName),
            "cache-control": "no-store",
          });
          out.stream.pipe(res);
          // End the response even when the stream breaks mid-way; a request
          // left hanging is the worst outcome available.
          out.stream.on("error", () => res.destroy());
        })
        .catch(() => json(res, 400, { error: "bad request" }));
      return;
    }

    // Adapter subscription for catalog changes: opened once and held, written
    // to whenever the panel connects or drops. The immediate event on subscribe
    // covers an adapter that connected before the panel was up, whose cached
    // tool list is already stale.
    if (req.method === "GET" && url.pathname === "/mcp/notifications") {
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
        "x-accel-buffering": "no",
      });
      toolSubscribers.add(res);
      // A subscribed adapter means a host is connected and waiting, so it keeps
      // the daemon warm exactly like the panel stream does.
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

    /**
     * 🔴 The one route that takes bytes. It never touches the JSON reader: the
     * body is a stream, and buffering it to parse would put the whole image in
     * memory for nothing. Authorisation is the one-time upload token, so a
     * token that has been spent or has expired stops the bytes at the door
     * rather than after they land.
     */
    if (req.method === "POST" && url.pathname === "/media/upload") {
      const stage = opts.mediaStage;
      if (!stage) {
        json(res, 404, { error: "not found" });
        return;
      }
      const auth = req.headers.authorization ?? "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
      if (!token) {
        json(res, 403, { error: "unauthorized" });
        return;
      }
      void stage
        .receiveUpload(token, req)
        .then((out) => {
          if (out.ok) {
            json(res, 202, { ok: true, bytes: out.bytes });
            return;
          }
          // 🔴 403 for a token this daemon will not honour, 400 for bytes it
          // will not keep. A caller retrying the first needs a new token; one
          // retrying the second needs different bytes.
          const status = out.reason === "upload_expired" ? 403 : 400;
          json(res, status, { error: out.reason });
        })
        .catch((err: unknown) => {
          opts.log?.(
            `media upload failed: ${err instanceof Error ? err.message : String(err)}`,
          );
          json(res, 500, { error: "upload_failed" });
        });
      return;
    }

    if (req.method === "POST" && url.pathname === "/bridge/result") {
      if (!opts.bridge.connected) {
        json(res, 403, { error: "handshake required" });
        return;
      }
      void readJson(req, MAX_RESULT_BODY_BYTES)
        .then((body) => {
          opts.bridge.receive(body);
          json(res, 202, { ok: true });
        })
        .catch((err: unknown) => {
          // 🔴 A refused answer leaves its request to time out, which points at
          // the tool rather than at the reply that never landed. This log line
          // is the only place the real reason exists.
          opts.log?.(
            `rejected an answer from the extension: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
          json(res, 400, { error: "bad request" });
        });
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
        // Closing alone waits for existing connections to end, and a pooled
        // keep-alive socket would hold it open indefinitely. This runs only on
        // a terminal path, and a stateless host reconnects.
        server.closeAllConnections?.();
      }),
  };
}

/**
 * Write a response, tolerating a caller that hung up first. Writing to a gone
 * socket throws, and that throw belongs to one abandoned request rather than to
 * the daemon serving every other connected app, so it stops here.
 */
export function writeSafely(
  res: ServerResponse,
  status: number,
  headers: Record<string, string>,
  body: string,
): void {
  if (res.writableEnded || res.destroyed) return;
  try {
    res.writeHead(status, headers);
    res.end(body);
  } catch {
    // Nothing to send it to.
  }
}

function json(res: ServerResponse, status: number, body: unknown): void {
  writeSafely(
    res,
    status,
    { "content-type": "application/json" },
    JSON.stringify(body),
  );
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
