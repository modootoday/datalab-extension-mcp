/**
 * @modootoday/extension-app-mcp-core — the transport-free half of the bridge.
 *
 * Both ends import this: the local MCP server, and the browser extension's side
 * panel. That is the point — a wire contract only holds if exactly one
 * definition of it exists. Keeping it free of transports, React, and Node
 * built-ins is what lets both sides share it.
 */
export * from "./protocol.js";
export * from "./negotiate.js";
export * from "./auth.js";
export * from "./allowlist.js";
export * from "./tools.js";
export * from "./reconnect.js";
export * from "./messages.js";
