/**
 * The daemon: one background process owning the loopback port and the panel
 * connection, serving many MCP clients over one stateless HTTP route.
 *
 * This is the surface the thin stdio adapter imports — how to bring the daemon
 * up, how to make sure one exists, and the handler answering the two methods.
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
export {
  LOG_MAX_BYTES,
  appendLogLine,
  logDir,
  logPath,
  openLogFd,
  rollIfLarge,
  rolledLogPath,
} from "./log-file.js";
