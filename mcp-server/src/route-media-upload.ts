import type { IncomingMessage, ServerResponse } from "node:http";

import type { HttpContext } from "./http-context.js";
import { json } from "./http-io.js";

/**
 * The one route that takes bytes. It never touches the JSON reader: the
 * body is a stream, and buffering it to parse would put the whole image in
 * memory for nothing. Authorisation is the one-time upload token, so a
 * token that has been spent or has expired stops the bytes at the door
 * rather than after they land.
 */
export function handleMediaUpload(
  ctx: HttpContext,
  req: IncomingMessage,
  res: ServerResponse,
): void {
  const { opts } = ctx;
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
}
