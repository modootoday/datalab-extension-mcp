import type { IncomingMessage, ServerResponse } from "node:http";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";

import { ARTIFACT_TOOLS } from "./bridge.js";
import { openLocalImage, openStagedImage } from "./local-file.js";
import type { HttpContext, StreamEntry } from "./http-context.js";
import { MAX_BODY_BYTES, correlationValue, json, readJson } from "./http-io.js";

// Where the extension reads one local image: a browser cannot open local
// files, and a photo does not fit in a handshake-sized frame.
//
// A token is required — loopback alone is not enough for a route that
// opens files. Consent is collected by the extension first.
//
// Any credential currently holding the bridge, not the root one alone: a
// browser registered with its own token holds only that, and gating on the
// root would leave it unable to insert a photo at all.
export function handleBridgeFile(
  ctx: HttpContext,
  req: IncomingMessage,
  res: ServerResponse,
): void {
  const { opts, streams } = ctx;
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
        invalidRequestId ||
        // An export-save permit names a job, never a file to read.
        (typeof b?.tool === "string" && ARTIFACT_TOOLS.has(b.tool))
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
        const out = path.startsWith("stage:")
          ? await openStagedImage(opts.mediaStage, path)
          : await (opts.openLocalImage ?? openLocalImage)(path);
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
}

export function handleFileCancel(
  ctx: HttpContext,
  req: IncomingMessage,
  res: ServerResponse,
): void {
  const { opts } = ctx;
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
}
