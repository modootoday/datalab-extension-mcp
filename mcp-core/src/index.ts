/**
 * The transport-free half of the bridge, imported by both ends: the local MCP
 * server and the browser extension's side panel. A wire contract only holds if
 * exactly one definition of it exists, so nothing here may import a transport,
 * React, or a Node built-in.
 */
export * from "./protocol.js";
export * from "./deadlines.js";
export * from "./negotiate.js";
export * from "./auth.js";
export * from "./credential.js";
export * from "./allowlist.js";
export * from "./annotations.js";
export * from "./errors.js";
export * from "./tools.js";
export * from "./toolsets.js";
export * from "./discovery.js";
export * from "./reconnect.js";
export * from "./messages.js";
export {
  SEMVER_RE,
  compareSemver,
  isOlderVersion,
  isSemver,
} from "./version.js";
export {
  MCP_DEFAULT_PORT,
  MCP_LOOPBACK_HOST,
  MCP_SERVER_HEALTH_NAME,
  bridgeUrl,
  isOurConnector,
} from "./identity.js";
