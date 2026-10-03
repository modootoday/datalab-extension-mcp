/**
 * How every surface recognises the connector, and where it lives.
 *
 * The health name was owned by a Node-only module, so the panel, the CLI and
 * the installer each retyped the literal and read the same document four
 * different ways. It is a protocol fact and belongs with the rest of them.
 */

/** What `/bridge/health` reports as its name. */
export const MCP_SERVER_HEALTH_NAME = "datalab-extension-mcp-server";

/** Loopback only — the connector binds nothing else. */
export const MCP_LOOPBACK_HOST = "127.0.0.1";
export const MCP_DEFAULT_PORT = 8765;

/** One place that knows the shape of a connector URL. */
export function bridgeUrl(port: number, path: string): string {
  return `http://${MCP_LOOPBACK_HOST}:${String(port)}${path}`;
}

/**
 * Is this health document ours?
 *
 * Name only. Callers that also need the version read it themselves — folding
 * the two made "a stranger answered" and "our connector, unreadable version"
 * the same verdict at one call site and not at another.
 */
export function isOurConnector(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { name?: unknown }).name === MCP_SERVER_HEALTH_NAME
  );
}
