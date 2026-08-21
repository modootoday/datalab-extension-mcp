/** Loopback HTTP transport for browser sessions and MCP hosts. */
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";

import {
  HEARTBEAT_INTERVAL_MS,
  MCP_SERVER_HEALTH_NAME,
  bearerToken,
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
   * Accepts this daemon's takeover secret on /mcp/shutdown, alongside the root
   * token. Absent means only the root token is honoured.
   */
  verifyTakeover?: (presented: string) => boolean;
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
  openLocalImage?: typeof openLocalImage;
}

/** Re-exported from the protocol package, which every surface can import. */
export { MCP_SERVER_HEALTH_NAME };
export const MCP_SERVER_HEALTH_SCHEMA = "datalab-extension-mcp-health-v1";

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
 * An over-cap reply is rejected whole and its request then waits out the
 * deadline, which reads from outside as a slow tool. The catalog must be
 * measured against this number, never assumed to fit under it.
 */
const MAX_RESULT_BODY_BYTES = 4 * 1024 * 1024;

/** 1, 10, 100, … — one line per order of magnitude instead of one per call. */
function isFirstOrDecade(n: number): boolean {
  if (n === 1) return true;
  let at = 10;
  while (at < n) at *= 10;
  return at === n;
}

/** node lowercases header names and repeats become an array; take the first. */
function headerValue(raw: string | string[] | undefined): string | undefined {
  const one = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = one?.trim();
  return trimmed ? trimmed.slice(0, 128) : undefined;
}

function correlationValue(value: string, max: number): string {
  return /^[a-zA-Z0-9_-]+$/.test(value) ? value.slice(0, max) : "redacted";
}

interface StreamEntry {
  readonly res: ServerResponse;
  readonly sessionId: string;
  readonly fileStreams: Set<Readable>;
  /**
   * Owned by the entry, not by the module. A timer outliving its stream is a
   * whole class of bug that stops being expressible when removal is the only
   * way to reach the entry the timer lives in.
   */
  readonly heartbeat: NodeJS.Timeout;
}

export interface HttpBridge {
  server: Server;
  /** Push a frame to one browser's panel. Returns false if nobody is listening. */
  send: (frame: BridgeDownstream, key: string) => boolean;
  disconnect: (key: string) => void;
  close: () => Promise<void>;
}

export function createHttpBridge(opts: HttpBridgeOptions): HttpBridge {
  const host = opts.host ?? "127.0.0.1";
  // Fail at startup rather than discover from the LAN at incident time.
  if (!isLoopbackHost(host)) {
    throw new Error(`Refusing to bind ${host}: the bridge is loopback-only.`);
  }

  const lifecycle = opts.lifecycle;
  // One live stream per browser, filed under the key its session belongs to.
  // Socket identity still decides whether a close is the live one's: a
  // superseded socket closing late must not tear down the stream that replaced
  // it, and under a map that comparison is per key rather than global.
  const streams = new Map<string, StreamEntry>();
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

  // Only the broadcast is deferred, so a panel reload cancels it before the
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

  // Counted, not refused. Whether `/mcp` can ever require a credential is a
  // question about who is still calling without one, and nothing was measuring
  // that. Logged on the first of each kind and then on powers of ten, so a busy
  // session says it once rather than every call.
  let withCredential = 0;
  let withoutCredential = 0;
  const noteMcpCredential = (present: boolean): void => {
    const n = present ? (withCredential += 1) : (withoutCredential += 1);
    if (!isFirstOrDecade(n)) return;
    opts.log?.(
      present
        ? `/mcp: ${n} call(s) carrying the pairing credential`
        : `/mcp: ${n} call(s) with no pairing credential`,
    );
  };

  // Counted, not arbitrated — the same reason as above, for a different
  // question. Two hosts driving one browser are indistinguishable everywhere:
  // they share the pairing credential, they share this route's token bucket,
  // and the editor lease gives every outside caller the same owner key, so it
  // lets both through rather than serializing them. Whether that is worth
  // fixing is a question about whether two ever run at once, and nothing was
  // measuring that. Only a rising high-water mark is logged, so the common
  // case of one host says nothing at all.
  const CLIENT_WINDOW_MS = 60_000;
  const CLIENT_ID_CAP = 64;
  const seenClients = new Map<string, number>();
  let mostAtOnce = 0;
  const noteMcpClient = (id: string | undefined, now: number): void => {
    if (!id) return;
    seenClients.set(id, now);
    for (const [at, last] of seenClients) {
      if (now - last > CLIENT_WINDOW_MS) seenClients.delete(at);
    }
    // A flood of one-shot ids must not become a leak; the count is what matters.
    while (seenClients.size > CLIENT_ID_CAP) {
      const oldest = seenClients.keys().next().value;
      if (oldest === undefined) break;
      seenClients.delete(oldest);
    }
    if (seenClients.size <= mostAtOnce) return;
    mostAtOnce = seenClients.size;
    if (mostAtOnce < 2) return;
    opts.log?.(
      `/mcp: ${mostAtOnce} adapters called within ${CLIENT_WINDOW_MS / 1000}s — outside callers are not told apart`,
    );
  };

  const send = (frame: BridgeDownstream, key: string): boolean => {
    const stream = streams.get(key);
    if (!stream || stream.res.writableEnded) return false;
    stream.res.write(`data: ${JSON.stringify(frame)}\n\n`);
    return true;
  };

  /**
   * The only place a stream enters the map, and the reference it holds is
   * taken here. One taken anywhere else would be given back by nobody, and the
   * daemon that is supposed to leave when it is unneeded never would.
   */
  const installStream = (
    key: string,
    sessionId: string,
    res: ServerResponse,
  ): void => {
    if (streams.has(key)) {
      throw new Error("stream slot is still occupied");
    }
    // The heartbeat keeps the extension's service worker alive while the
    // stream is idle; without it the worker is evicted and the panel silently
    // stops answering.
    const heartbeat = setInterval(() => {
      send({ t: "hb", at: Date.now() }, key);
    }, opts.heartbeatMs ?? HEARTBEAT_INTERVAL_MS);
    heartbeat.unref?.();
    streams.set(key, { res, sessionId, heartbeat, fileStreams: new Set() });
    if (!opts.bridge.activateSession(key, sessionId)) {
      clearInterval(heartbeat);
      deleteStreamEntry(key);
      throw new Error("stream session is no longer current");
    }
    lifecycle?.retain?.();
  };

  const deleteStreamEntry = (key: string): void => {
    streams.delete(key);
  };

  /**
   * The only place a stream leaves the map, and the reference goes back here.
   * Releasing outside this would double-count, and `lifecycle` clamps at zero —
   * so an over-release does not throw, it silently parks the daemon on a count
   * too low and lets it exit under a live panel.
   */
  const removeStream = (key: string): ServerResponse | null => {
    const stream = streams.get(key);
    if (!stream) return null;
    clearInterval(stream.heartbeat);
    for (const fileStream of stream.fileStreams) {
      fileStream.destroy(new Error("browser session ended"));
    }
    stream.fileStreams.clear();
    deleteStreamEntry(key);
    lifecycle?.release?.();
    return stream.res;
  };

  // Only the socket that still owns this key's stream may end the session; a
  // superseded socket closing late must be a no-op.
  const onSseClose = (key: string, res: ServerResponse): void => {
    if (streams.get(key)?.res !== res) return;
    // The catalog every host sees comes from the oldest session, so only its
    // stream going away is worth telling them about.
    const wasPrimary = key === opts.bridge.sessionKey;
    removeStream(key);
    opts.bridge.disconnect(key);
    if (wasPrimary) scheduleToolsDrop();
  };

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://${host}`);
    const origin = req.headers.origin;

    // The public MCP transport. Loopback reach is the gate; a stateless POST
    // carries its own id, so many hosts share this route with no session map.
    //
    // That gate is weaker than the answer routes' and knowingly so. This one
    // is shared by every host on the machine, so no single caller can decide a
    // credential is mandatory without locking out the adapters that never
    // update. Adapters send one; nothing requires it yet. What is counted below
    // is the evidence for deciding whether that can change.
    if (req.method === "POST" && url.pathname === "/mcp") {
      // Any traffic here is activity — reset the idle debounce so a burst of
      // adapters starting at once never trips an idle-exit mid-call.
      lifecycle?.bump?.();
      noteMcpCredential(bearerToken(req.headers.authorization) !== null);
      noteMcpClient(
        headerValue(req.headers["x-datalab-mcp-client"]),
        Date.now(),
      );
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
          // A caller that walked away leaves nothing to report back, but an
          // unhandled rejection here would end a process every other host is
          // sharing.
        });
      return;
    }

    // Deliberately open so the panel can distinguish this server from a process
    // occupying the same port. It reveals only identity and contract version.
    if (req.method === "GET" && url.pathname === "/bridge/health") {
      json(res, 200, {
        name: MCP_SERVER_HEALTH_NAME,
        version: opts.identity.version,
        schema: MCP_SERVER_HEALTH_SCHEMA,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/mcp/authority") {
      void readJson(req, MAX_BODY_BYTES)
        .then((body) => {
          const token = (body as { token?: unknown } | null)?.token;
          if (
            !opts.bridge.verifyRootToken(typeof token === "string" ? token : "")
          ) {
            json(res, 403, { error: "authority_mismatch" });
            return;
          }
          res.writeHead(204, { "cache-control": "no-store" });
          res.end();
        })
        .catch(() => json(res, 400, { error: "bad request" }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/bridge/hello") {
      void readJson(req, MAX_BODY_BYTES)
        .then((body) => {
          const out = opts.bridge.handshake(body, origin);
          // One status for every refusal, so a prober cannot tell a wrong
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
      const claimed = url.searchParams.get("session");
      if (claimed === null || claimed.length === 0) {
        json(res, 400, { error: "session_required" });
        return;
      }
      const key = claimed === null ? null : opts.bridge.keyForSession(claimed);
      if (key === null) {
        opts.log?.("refused a stream for an unknown session");
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.end();
        return;
      }
      // A stream carries every request this browser will be asked to run and
      // is where their ids become readable, so taking one is the whole attack.
      // Only sessions that asked to be held to their credential are gated —
      // see `Bridge.authorizeSession`.
      if (
        !opts.bridge.authorizeSession(
          key,
          bearerToken(req.headers.authorization),
        )
      ) {
        opts.log?.("refused an unauthorised stream");
        json(res, 403, { error: "unauthorized" });
        return;
      }
      // A second stream for the same browser would race the first for its
      // replies. Another browser's is not a duplicate.
      if (streams.has(key)) {
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
      try {
        installStream(key, claimed, res);
      } catch {
        res.end();
        return;
      }
      send({ t: "hb", at: Date.now() }, key);
      if (key === opts.bridge.sessionKey) {
        cancelToolsDrop();
        // The catalog just became available, so every host is told to re-fetch;
        // one that connected before the panel came up stops showing no tools.
        notifyToolsChanged();
      }
      // Session-scoped: only this exact socket closing ends this session.
      req.on("close", () => onSseClose(key, res));
      return;
    }

    // An updating adapter asking this daemon to step aside: the singleton bind
    // means a newer version cannot start while this one holds the port.  The
    // token gates it, so no other local process can stop the daemon.
    if (req.method === "POST" && url.pathname === "/mcp/shutdown") {
      void readJson(req, MAX_BODY_BYTES)
        .then((body) => {
          const token = (body as { token?: unknown } | null)?.token;
          const presented = typeof token === "string" ? token : "";
          // The pairing token, which every browser attached here holds: with
          // one key per machine this is the same person's browsers, and a
          // host spawns the daemon again on its next call.
          //
          // Or the takeover secret, which is a file only this machine's user
          // can read (takeover.ts). An adapter spawned from a host config on
          // this machine can present it and retire a daemon holding a
          // different root token; a page speaking HTTP to loopback cannot read
          // a file, so what the token gate protects is unchanged.
          if (
            !opts.bridge.verifyRootToken(presented) &&
            !(opts.verifyTakeover?.(presented) ?? false)
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
    // A token is required — loopback alone is not enough for a route that
    // opens files. Consent is collected by the extension first.
    //
    // Any credential currently holding the bridge, not the root one alone: a
    // browser registered with its own token holds only that, and gating on the
    // root would leave it unable to insert a photo at all.
    if (req.method === "POST" && url.pathname === "/bridge/file") {
      void readJson(req, MAX_BODY_BYTES)
        .then(async (body) => {
          const b = body as {
            token?: unknown;
            sessionId?: unknown;
            requestId?: unknown;
            path?: unknown;
            tool?: unknown;
          } | null;
          const token = typeof b?.token === "string" ? b.token : "";
          const path = typeof b?.path === "string" ? b.path : "";
          const hasSessionId = b !== null && Object.hasOwn(b, "sessionId");
          const hasRequestId = b !== null && Object.hasOwn(b, "requestId");
          const invalidSessionId =
            hasSessionId &&
            (typeof b?.sessionId !== "string" || b.sessionId.length === 0);
          const invalidRequestId =
            hasRequestId &&
            (typeof b?.requestId !== "string" || b.requestId.length === 0);
          if (
            !hasSessionId ||
            !hasRequestId ||
            invalidSessionId ||
            invalidRequestId
          ) {
            json(res, 403, {
              error: "unauthorized",
              message: "사진 요청의 연결 정보를 확인하지 못했어요.",
            });
            return;
          }
          const auth = opts.bridge.authorizeFileRequest({
            sessionId: b!.sessionId as string,
            requestId: b!.requestId as string,
            token,
            path,
            ...(typeof b?.tool === "string" ? { tool: b.tool } : {}),
          });
          if (!auth.ok) {
            opts.log?.(
              `file request refused: reason=${auth.reason} credential=${auth.credential} tokenPresent=${String(token.length > 0)} sessionMatch=${String(auth.key !== undefined)} open=not-entered`,
            );
            json(res, 403, {
              error: "unauthorized",
              message: "사진을 가져올 연결을 확인하지 못했어요.",
            });
            return;
          }
          const streamEntry = streams.get(auth.key);
          if (
            !streamEntry ||
            streamEntry.sessionId !== auth.sessionId ||
            !opts.bridge.isSessionStreamActive(auth.key, auth.sessionId) ||
            !opts.bridge.consumeFileRequest(auth)
          ) {
            opts.log?.(
              `file request refused: reason=file_session_not_live credential=${auth.credential} tokenPresent=true sessionMatch=false open=not-entered`,
            );
            json(res, 403, {
              error: "unauthorized",
              message: "사진을 가져올 연결이 열려 있지 않아요.",
            });
            return;
          }
          opts.log?.(
            `file request authorised: browser=${correlationValue(auth.key, 8)} session=${correlationValue(auth.sessionId, 32)} request=${correlationValue(auth.requestId!, 96)} credential=${auth.credential} open=entered`,
          );
          let source: Readable | null = null;
          let owner: StreamEntry | null = null;
          let peerClosed = false;
          const stop = (): void => {
            peerClosed = true;
            source?.destroy();
          };
          req.once("aborted", stop);
          res.once("close", stop);
          try {
            const out = await (opts.openLocalImage ?? openLocalImage)(path);
            if (!out.ok) {
              if (!peerClosed) {
                json(res, 400, { error: out.reason, message: out.message });
              }
              return;
            }
            source = out.stream;
            if (peerClosed) {
              source.destroy();
              return;
            }
            const current = streams.get(auth.key);
            if (
              current !== streamEntry ||
              current.sessionId !== auth.sessionId ||
              !opts.bridge.isSessionStreamActive(auth.key, auth.sessionId)
            ) {
              source.destroy(new Error("browser session ended"));
              json(res, 403, {
                error: "unauthorized",
                message: "사진을 가져올 연결이 열려 있지 않아요.",
              });
              return;
            }
            res.writeHead(200, {
              "content-type": out.contentType,
              "content-length": String(out.byteLength),
              "x-file-name": encodeURIComponent(out.fileName),
              "cache-control": "no-store",
            });
            owner = current;
            owner.fileStreams.add(source);
            await pipeline(source, res);
          } catch {
            if (!res.writableEnded) res.destroy();
          } finally {
            req.off("aborted", stop);
            res.off("close", stop);
            if (source) owner?.fileStreams.delete(source);
          }
        })
        .catch(() => json(res, 400, { error: "bad request" }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/bridge/file/cancel") {
      void readJson(req, MAX_BODY_BYTES)
        .then((body) => {
          const b = body as {
            token?: unknown;
            sessionId?: unknown;
            requestId?: unknown;
          } | null;
          if (
            typeof b?.token !== "string" ||
            typeof b.sessionId !== "string" ||
            typeof b.requestId !== "string"
          ) {
            json(res, 403, { error: "unauthorized" });
            return;
          }
          const reason = opts.bridge.cancelFileRequest({
            token: b.token,
            sessionId: b.sessionId,
            requestId: b.requestId,
          });
          json(res, reason === null ? 200 : 403, {
            ...(reason === null ? { ok: true } : { error: "unauthorized" }),
          });
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
     * The one route that takes bytes. It never touches the JSON reader: the
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
          // 403 for a token this daemon will not honour, 400 for bytes it
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
      const presented = bearerToken(req.headers.authorization);
      void readJson(req, MAX_RESULT_BODY_BYTES)
        .then((body) => {
          // Answered per session, not per server: the credential is checked
          // against the session that owns the id, so one browser's caller can
          // never settle another's call.
          if (opts.bridge.receive(body, presented) === "unauthorized") {
            opts.log?.("refused an answer from an unauthorised caller");
            json(res, 403, { error: "unauthorized" });
            return;
          }
          json(res, 202, { ok: true });
        })
        .catch((err: unknown) => {
          // A refused answer leaves its request to time out, which points at
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
    disconnect: (key) => {
      const wasPrimary = key === opts.bridge.sessionKey;
      removeStream(key)?.end();
      opts.bridge.disconnect(key);
      if (wasPrimary) scheduleToolsDrop();
    },
    close: () =>
      new Promise<void>((resolve) => {
        cancelToolsDrop();
        // Nothing in flight can land once the server is going, and a request
        // registry outlives this call: dropping it with a request still inside
        // leaves that promise neither resolved nor rejected. Production exits
        // right after, but the invariant is not the process lifetime's to keep.
        opts.bridge.disconnectAll();
        for (const key of [...streams.keys()]) removeStream(key)?.end();
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
