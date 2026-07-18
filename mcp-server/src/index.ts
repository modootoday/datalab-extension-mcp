/**
 * @modootoday/extension-app-mcp-server — the daemon.
 *
 * One background process owns 127.0.0.1:8765 and the panel connection, and
 * serves many MCP clients over `POST /mcp`. It replaces the old
 * one-server-per-host model, in which every host raced for the same port and
 * only one survived. The bridge, protocol, and security model are unchanged —
 * this package changes only the transport topology.
 *
 * This is the surface the thin stdio adapter imports: how to bring the daemon
 * up (`runDaemon`), how to make sure one exists (`ensureDaemon` / `spawnDaemon`),
 * and the `/mcp` handler that answers the two methods.
 */
export {
  Bridge,
  BridgeError,
  assertUsableToken,
  BRIDGE_PROTOCOL_VERSION,
  type BridgeDeps,
  type BridgeSession,
} from "./bridge.js";
export {
  createHttpBridge,
  type HttpBridge,
  type HttpBridgeOptions,
  type LifecycleHooks,
} from "./http.js";
export {
  handleMcpRequest,
  createMcpHttpHandler,
  frameMcpResponse,
  MAX_MCP_BODY_BYTES,
  type McpHttpResponse,
  type McpNodeRequest,
  type McpNodeResponse,
} from "./mcp-http.js";
export {
  DEFAULT_HOST,
  DEFAULT_PORT,
  resolveConfig,
  type ConfigEnv,
  type ConfigOutcome,
  type McpConfig,
} from "./config.js";
export {
  PendingRegistry,
  DEFAULT_TIMEOUT_MS,
  type PendingOutcome,
} from "./pending.js";
export {
  tryConnect,
  spawnDaemon,
  ensureDaemon,
  bindAsLock,
  type Connector,
  type DaemonSpawner,
  type Sleeper,
  type TryConnectDeps,
  type SpawnDaemonDeps,
  type EnsureDaemonDeps,
  type BindableServer,
} from "./singleton.js";
export {
  Lifecycle,
  type LifecycleDeps,
  type TimerHandle,
} from "./lifecycle.js";
export { runDaemon, type RunDaemonDeps, type RunningDaemon } from "./daemon.js";
