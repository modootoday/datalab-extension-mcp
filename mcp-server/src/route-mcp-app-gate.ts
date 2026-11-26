import { normalizeAppName } from "@modootoday/datalab-extension-app-mcp-core";

import { frameMcpResponse, type McpHttpResponse } from "./mcp-http.js";
import type { AppBook } from "./pairing/index.js";

const CODE_APP_NOT_APPROVED = -32001;

const WAITING_TEXT =
  "This AI app is waiting for approval in the Datalab side panel. Approve it there, then call again.";
const REFUSED_TEXT =
  "This AI app was refused in the Datalab side panel. Restart the connector to be asked again.";

/**
 * Holds a tool call from an AI app the user has not approved.
 *
 * Every call that names an app is noted, so the panel can ask; only a tool
 * call is held. A call that names no app is outside the per-app approval.
 */
export function gateMcpApp(
  apps: AppBook | undefined,
  nameHeader: string | undefined,
  body: unknown,
  accept: string | undefined,
): McpHttpResponse | null {
  if (apps === undefined) return null;
  const name = normalizeAppName(nameHeader);
  if (name === null) return null;
  const standing = apps.see(name);
  if (standing === "approved") return null;
  const request = (typeof body === "object" && body !== null ? body : {}) as {
    id?: unknown;
    method?: unknown;
  };
  if (request.method !== "tools/call") return null;
  return frameMcpResponse(
    {
      jsonrpc: "2.0",
      id: request.id ?? null,
      error: {
        code: CODE_APP_NOT_APPROVED,
        message: standing === "refused" ? REFUSED_TEXT : WAITING_TEXT,
      },
    },
    accept,
  );
}
