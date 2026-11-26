import type { IncomingMessage, ServerResponse } from "node:http";

import type { HttpContext } from "./http-context.js";
import { MAX_BODY_BYTES, json, readJson } from "./http-io.js";

/** The route the side panel uses to see and answer which AI apps ask to connect. */
export function handlePairing(
  ctx: HttpContext,
  req: IncomingMessage,
  res: ServerResponse,
): void {
  const desk = ctx.opts.pairingDesk;
  if (!desk) {
    json(res, 404, { error: "not found" });
    return;
  }
  const origin = req.headers.origin;
  void readJson(req, MAX_BODY_BYTES)
    .then((body) => {
      const reply = desk.handle(body, origin);
      json(res, reply.status, reply.answer);
    })
    .catch(() => json(res, 400, { ok: false, reason: "bad_request" }));
}
