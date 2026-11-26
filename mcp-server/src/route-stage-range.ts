import type { IncomingMessage, ServerResponse } from "node:http";

import type { HttpContext } from "./http-context.js";
import { MAX_BODY_BYTES, json, readJson } from "./http-io.js";

// A sealed stage asset read in pieces (plan D2): the panel pulls a large
// video a range at a time under a grant its tool call created, so neither
// side holds the whole file and the transfer outlives one request.
export function handleStageRange(
  ctx: HttpContext,
  req: IncomingMessage,
  res: ServerResponse,
): void {
  const { opts } = ctx;
  void readJson(req, MAX_BODY_BYTES)
    .then(async (body) => {
      const b = body as {
        token?: unknown;
        sessionId?: unknown;
        handle?: unknown;
        offset?: unknown;
        length?: unknown;
      } | null;
      const handle = typeof b?.handle === "string" ? b.handle : "";
      const offset = b?.offset;
      const length = b?.length;
      if (
        typeof b?.sessionId !== "string" ||
        typeof offset !== "number" ||
        typeof length !== "number" ||
        !Number.isInteger(offset) ||
        !Number.isInteger(length) ||
        offset < 0 ||
        length < 1
      ) {
        json(res, 400, {
          error: "bad_request",
          message: "읽을 범위를 확인하지 못했어요.",
        });
        return;
      }
      const auth = opts.bridge.authorizeStageRead({
        sessionId: b.sessionId,
        token: typeof b.token === "string" ? b.token : "",
        handle,
      });
      if (!auth.ok || !opts.mediaStage) {
        opts.log?.(
          `stage range refused: reason=${auth.ok ? "no_stage" : auth.reason}`,
        );
        json(res, 403, {
          error: "unauthorized",
          message: "이 파일을 읽을 권한이 없어요.",
        });
        return;
      }
      const info = await opts.mediaStage.sealedInfo(handle);
      if (!info) {
        json(res, 404, {
          error: "not_found",
          message: "봉인된 파일을 찾지 못했어요.",
        });
        return;
      }
      if (offset > info.bytes) {
        json(res, 416, {
          error: "out_of_range",
          message: "파일 끝을 넘어 읽으려고 했어요.",
        });
        return;
      }
      const piece = await opts.mediaStage.readRange(handle, offset, length);
      res.writeHead(200, {
        "content-type": "application/octet-stream",
        "content-length": String(piece.byteLength),
        "x-total-bytes": String(info.bytes),
        "x-stage-kind": info.kind,
        "access-control-expose-headers": "x-total-bytes, x-stage-kind",
        "cache-control": "no-store",
      });
      res.end(piece);
    })
    .catch(() => {
      if (!res.headersSent) {
        json(res, 400, {
          error: "bad_request",
          message: "읽을 범위를 확인하지 못했어요.",
        });
      } else if (!res.writableEnded) {
        res.destroy();
      }
    });
}
