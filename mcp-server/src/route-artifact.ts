import type { IncomingMessage, ServerResponse } from "node:http";

import { ARTIFACT_TOOLS, artifactPath } from "./bridge.js";
import type { HttpContext } from "./http-context.js";
import { MAX_ARTIFACT_BODY_BYTES, json, readJson } from "./http-io.js";

// Where the panel hands back an editor export, chunk by chunk. Bound to
// the export-save call in flight: its permit names the one job it may
// write, and the folder is the daemon's, never the caller's.
export function handleArtifact(
  ctx: HttpContext,
  req: IncomingMessage,
  res: ServerResponse,
): void {
  const { opts } = ctx;
  const store = opts.artifactStore;
  if (!store) {
    json(res, 404, { error: "not found" });
    return;
  }
  void readJson(req, MAX_ARTIFACT_BODY_BYTES)
    .then(async (body) => {
      const b = (body ?? {}) as Record<string, unknown>;
      const str = (k: string): string =>
        typeof b[k] === "string" ? (b[k] as string) : "";
      const tool = str("tool");
      const path = artifactPath(b["job"]);
      if (
        !str("sessionId") ||
        !str("requestId") ||
        !ARTIFACT_TOOLS.has(tool) ||
        path === undefined
      ) {
        json(res, 403, { error: "unauthorized" });
        return;
      }
      const auth = opts.bridge.authorizeFileRequest({
        sessionId: str("sessionId"),
        requestId: str("requestId"),
        token: str("token"),
        path,
        tool,
      });
      if (!auth.ok) {
        opts.log?.(`artifact refused: reason=${auth.reason}`);
        json(res, 403, { error: "unauthorized" });
        return;
      }
      const offset = b["offset"];
      if (typeof offset !== "number" || !Number.isInteger(offset)) {
        json(res, 400, { error: "bad_offset" });
        return;
      }
      const out = await store.write({
        key: `${str("sessionId")}:${str("requestId")}:${str("name")}`,
        name: str("name"),
        offset,
        data: str("data"),
        final: b["final"] === true,
        ...(typeof b["bytes"] === "number" ? { bytes: b["bytes"] } : {}),
        ...(str("sha256") ? { sha256: str("sha256") } : {}),
      });
      json(res, out.ok ? 200 : 400, out);
    })
    .catch(() => json(res, 400, { error: "bad request" }));
}
