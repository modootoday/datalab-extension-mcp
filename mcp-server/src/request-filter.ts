/**
 * Refuses what only a web page sends: a Host that is not this loopback port
 * (DNS rebinding), a page Origin on the MCP routes, and a body type a page can
 * post without a preflight. Local clients send none of these.
 */
import type { IncomingMessage } from "node:http";

export interface RequestRefusal {
  status: 403 | 415;
  error: "forbidden_host" | "forbidden_origin" | "unsupported_media_type";
}

const OPEN_PATH = "/bridge/health";
const MCP_PATHS = new Set(["/mcp", "/mcp/notifications"]);

function hostAllowed(raw: string | undefined, port: number): boolean {
  if (raw === undefined) return false;
  const host = raw.trim().toLowerCase();
  return host === `127.0.0.1:${port}` || host === `localhost:${port}`;
}

function originAllowed(
  raw: string | undefined,
  extensionIds: readonly string[],
): boolean {
  if (raw === undefined) return true;
  return extensionIds.some((id) => raw === `chrome-extension://${id}`);
}

function isJson(raw: string | undefined): boolean {
  const type = raw?.split(";")[0]?.trim().toLowerCase();
  return type === "application/json";
}

export function refuseRequest(
  req: IncomingMessage,
  pathname: string,
  extensionIds: readonly string[],
): RequestRefusal | null {
  if (pathname === OPEN_PATH) return null;
  const port = req.socket.localPort ?? -1;
  if (!hostAllowed(req.headers.host, port)) {
    return { status: 403, error: "forbidden_host" };
  }
  if (!MCP_PATHS.has(pathname)) return null;
  if (!originAllowed(req.headers.origin, extensionIds)) {
    return { status: 403, error: "forbidden_origin" };
  }
  if (req.method === "POST" && pathname === "/mcp") {
    if (!isJson(req.headers["content-type"])) {
      return { status: 415, error: "unsupported_media_type" };
    }
  }
  return null;
}
