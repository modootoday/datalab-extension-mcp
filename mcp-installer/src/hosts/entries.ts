/**
 * What a host's config entry contains — vendor-agnostic.
 *
 * A vendor descriptor decides WHERE its entry goes and in what shape the
 * host expects it. What the entry says about our server is decided here once,
 * so a new vendor cannot invent a different command line for the same daemon.
 */

export const SERVER_NAME = "datalab";
export const SERVER_PACKAGE = "@modootoday/datalab-extension-mcp";
/** The gateway's default port — omitted from configs to keep them minimal. */
export const DEFAULT_PORT = "8765";

/**
 * The published store extension id — a fixed, public value. Defaulted in the
 * interactive flow so a non-technical user only has to paste the token. A dev
 * build or another browser store has a different id and must pass it in.
 */
export const DEFAULT_EXTENSION_ID = "ldoknfkedngbdfgdkeicojmhnojgpdcb";

export interface ServerEntryOptions {
  version: string;
  token: string;
  extensionId: string;
  port?: string;
}

export function packageSpec(version: string): string {
  return `${SERVER_PACKAGE}@${version}`;
}

function isCustomPort(port: string | undefined): port is string {
  if (port === undefined || port === "") {
    return false;
  }
  return port !== DEFAULT_PORT;
}

export function buildEnv(opts: ServerEntryOptions): Record<string, string> {
  const env: Record<string, string> = {
    DATALAB_MCP_TOKEN: opts.token,
    DATALAB_MCP_EXTENSION_ID: opts.extensionId,
  };
  if (isCustomPort(opts.port)) {
    env["DATALAB_MCP_PORT"] = opts.port;
  }
  return env;
}

/** The same values as {@link buildEnv}, in the `KEY=value` shape CLIs take. */
export function envPairs(opts: ServerEntryOptions): string[] {
  const pairs = [
    `DATALAB_MCP_TOKEN=${opts.token}`,
    `DATALAB_MCP_EXTENSION_ID=${opts.extensionId}`,
  ];
  if (isCustomPort(opts.port)) {
    pairs.push(`DATALAB_MCP_PORT=${opts.port}`);
  }
  return pairs;
}

/** A host spawns our stdio adapter. */
export interface StdioFileEntry {
  command: string;
  args: string[];
  env: Record<string, string>;
}

/** A host connects to the daemon's HTTP endpoint directly (no adapter). */
export interface UrlFileEntry {
  url: string;
}

export type FileServerEntry = StdioFileEntry | UrlFileEntry;

/**
 * The daemon's MCP HTTP endpoint.  A literal IPv4 address, never "localhost",
 * which resolves IPv6-first on Windows. Hosts that speak HTTP MCP connect here
 * directly, with no adapter process spawned for them.
 */
export function daemonMcpUrl(opts: ServerEntryOptions): string {
  const port = isCustomPort(opts.port) ? opts.port : DEFAULT_PORT;
  return `http://127.0.0.1:${port}/mcp`;
}

export function buildUrlEntry(opts: ServerEntryOptions): UrlFileEntry {
  return { url: daemonMcpUrl(opts) };
}

/**
 * The JSON config entry a file-writing or snippet host receives.
 *
 * On Windows the package runner is a .cmd shim and host apps spawn config
 * entries without a shell, so it must be invoked through the command
 * interpreter. Vendor CLI registrations handle their own shells.
 */
export function buildFileEntry(
  opts: ServerEntryOptions,
  platform: string,
): FileServerEntry {
  const spec = packageSpec(opts.version);
  if (platform === "win32") {
    return {
      command: "cmd",
      args: ["/c", "npx", "-y", spec],
      env: buildEnv(opts),
    };
  }
  return {
    command: "npx",
    args: ["-y", spec],
    env: buildEnv(opts),
  };
}
