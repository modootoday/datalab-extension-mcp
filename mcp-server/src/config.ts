/**
 * Server configuration — pure resolution, no I/O.
 *
 * No discovery, no config file, and no fallback that would let the server
 * come up in a state the user did not ask for. A bridge brokering a logged-in
 * browser session never guesses.
 */
import {
  MIN_TOKEN_LENGTH,
  isLoopbackHost,
} from "@modootoday/extension-app-mcp-core";

export interface McpConfig {
  /** Loopback port for the private bridge. */
  port: number;
  /** Loopback host. Never a wildcard. */
  host: string;
  /** Pairing token the panel must present. */
  token: string;
  /**
   * The extension ids allowed to connect.
   *
   * A list in shape, and exactly one in every configuration this resolver
   * can produce. Two would mean two installs sharing one pairing token, and a
   * token belongs to the browser it was issued for.
   */
  extensionIds: readonly string[];
}

/**
 * Arbitrary, but deliberately not a common dev port. Overridable because
 * collisions are a known pain for any local bridge. It is not a secret — the
 * token is what authorises, not the port number.
 */
export const DEFAULT_PORT = 8765;
export const DEFAULT_HOST = "127.0.0.1";

export interface ConfigEnv {
  DATALAB_MCP_PORT?: string;
  DATALAB_MCP_HOST?: string;
  DATALAB_MCP_TOKEN?: string;
  DATALAB_MCP_EXTENSION_ID?: string;
}

export type ConfigOutcome =
  | { ok: true; config: McpConfig }
  | { ok: false; message: string };

/**
 * Resolve config from the environment, failing closed on every missing value.
 * A generated token would defeat pairing, since the panel could not know it,
 * and a guessed extension id would let any extension connect.
 */
export function resolveConfig(env: ConfigEnv): ConfigOutcome {
  const token = env.DATALAB_MCP_TOKEN?.trim();
  if (!token) {
    return {
      ok: false,
      message:
        "DATALAB_MCP_TOKEN is not set. Copy the pairing token from the extension's side panel.",
    };
  }
  if (token.length < MIN_TOKEN_LENGTH) {
    return {
      ok: false,
      message: `DATALAB_MCP_TOKEN must be at least ${MIN_TOKEN_LENGTH} characters; got ${token.length}.`,
    };
  }

  const extensionId = env.DATALAB_MCP_EXTENSION_ID?.trim();
  if (!extensionId) {
    return {
      ok: false,
      message:
        "DATALAB_MCP_EXTENSION_ID is not set. Copy the extension id from the side panel.",
    };
  }

  const host = env.DATALAB_MCP_HOST?.trim() || DEFAULT_HOST;
  if (!isLoopbackHost(host)) {
    return {
      ok: false,
      message: `DATALAB_MCP_HOST must be a loopback address; got "${host}". This bridge is never exposed beyond your machine.`,
    };
  }

  const port = parsePort(env.DATALAB_MCP_PORT);
  if (port === null) {
    return {
      ok: false,
      message: `DATALAB_MCP_PORT must be a port number between 1 and 65535; got "${env.DATALAB_MCP_PORT}".`,
    };
  }

  return {
    ok: true,
    config: { port, host, token, extensionIds: [extensionId] },
  };
}

function parsePort(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === "") return DEFAULT_PORT;
  // Number rather than parseInt, which would read a trailing-garbage value as
  // a valid prefix and bind a port the user never asked for.
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 65535) return null;
  return n;
}
