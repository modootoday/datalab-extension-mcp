/** Loopback HTTP transport for browser sessions and MCP hosts. */
import { createServer, type Server, type ServerResponse } from "node:http";

import {
  HEARTBEAT_INTERVAL_MS,
  MCP_APP_HEADER,
  MCP_SERVER_HEALTH_NAME,
  PAIRING_ROUTE,
  bearerToken,
  isLoopbackHost,
  type BridgeDownstream,
} from "@modootoday/datalab-extension-app-mcp-core";

import { handleMcpRequest } from "./mcp-http.js";
import { createMcpObservation } from "./mcp-observation.js";
import type {
  HttpBridgeOptions,
  HttpContext,
  LifecycleHooks,
  StreamEntry,
} from "./http-context.js";
import {
  MAX_BODY_BYTES,
  MAX_RESULT_BODY_BYTES,
  headerValue,
  json,
  readJson,
  writeSafely,
} from "./http-io.js";
import { handleArtifact } from "./route-artifact.js";
import { handleBridgeFile, handleFileCancel } from "./route-bridge-file.js";
import { gateMcpApp } from "./route-mcp-app-gate.js";
import { handleMediaUpload } from "./route-media-upload.js";
import { handlePairing } from "./route-pairing.js";
import { handleStageRange } from "./route-stage-range.js";
import { refuseRequest } from "./request-filter.js";

export type { HttpBridgeOptions, LifecycleHooks };
export { writeSafely };

/** Re-exported from the protocol package, which every surface can import. */
export { MCP_SERVER_HEALTH_NAME };
export const MCP_SERVER_HEALTH_SCHEMA = "datalab-extension-mcp-health-v1";

/** Default catalog-drop debounce — long enough to absorb a reload, short enough to feel live. */
const DEFAULT_TOOLS_CHANGED_DEBOUNCE_MS = 600;

/** MCP bodies carry tool args (ids, keywords), larger than a hello but still small. */
const MAX_MCP_BODY_BYTES = 256 * 1024;

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
  const ctx: HttpContext = { opts, streams };
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

  const mcpObservation = createMcpObservation(opts.log);

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
    const refusal = refuseRequest(req, url.pathname, opts.bridge.extensionIds);
    if (refusal !== null) {
      req.resume();
      json(res, refusal.status, { error: refusal.error });
      return;
    }

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
      mcpObservation.noteCredential(
        bearerToken(req.headers.authorization) !== null,
      );
      mcpObservation.noteClient(
        headerValue(req.headers["x-datalab-mcp-client"]),
        Date.now(),
      );
      void readJson(req, MAX_MCP_BODY_BYTES)
        .then(
          (body) =>
            gateMcpApp(
              opts.apps,
              headerValue(req.headers[MCP_APP_HEADER]),
              body,
              req.headers.accept,
            ) ??
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
        // Lets a local installer tie this answer to the process it may end.
        pid: process.pid,
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

    if (req.method === "POST" && url.pathname === PAIRING_ROUTE) {
      handlePairing(ctx, req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/bridge/file") {
      handleBridgeFile(ctx, req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/bridge/stage-range") {
      handleStageRange(ctx, req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/bridge/artifact") {
      handleArtifact(ctx, req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/bridge/file/cancel") {
      handleFileCancel(ctx, req, res);
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

    if (req.method === "POST" && url.pathname === "/media/upload") {
      handleMediaUpload(ctx, req, res);
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
