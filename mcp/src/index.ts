/**
 * The thin stdio adapter for the browser bridge.
 *
 * An MCP host spawns this package's bin; it speaks MCP over stdio and forwards
 * both methods to a shared background daemon over loopback HTTP. It holds no
 * credentials, binds no port, and makes no network requests of its own — every
 * tool call runs inside the user's own browser session and returns the same
 * way. The daemon itself is a separate package, inlined here at build time.
 */
export {
  ensureDaemonRunning,
  createAdapterServer,
  runAdapter,
  dispatchCli,
  type FetchImpl,
  type EnsureRunningDeps,
  type AdapterServerDeps,
  type RunAdapterDeps,
  type CliHandlers,
} from "./adapter.js";
