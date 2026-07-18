/**
 * @modootoday/extension-app-mcp — the thin stdio adapter for the browser bridge.
 *
 * An MCP host spawns this package's bin; it speaks MCP over stdio and forwards
 * `tools/list` / `tools/call` to a shared background daemon over loopback HTTP.
 * It holds no credentials, binds no port, and makes no network requests of its
 * own — every tool call runs inside your own browser session via the extension,
 * and the answer comes back the same way. This module exports the adapter
 * surface for embedders and tests; the daemon itself lives in
 * `@modootoday/extension-app-mcp-server`, inlined into this package at build.
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
