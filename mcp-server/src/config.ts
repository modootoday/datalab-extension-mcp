/**
 * Server configuration — pure resolution, no I/O.
 *
 * Everything is explicit. There is no discovery, no config file, and no
 * fallback that would let the server come up in a state the user did not ask
 * for: a bridge that brokers a logged-in browser session should never guess.
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
  /** The one extension id allowed to connect. */
  extensionId: string;
}

/**
 * 8765 — arbitrary but deliberately not a common dev port.
 *
 * Collisions are a documented pain in every comparable bridge, so the port is
 * overridable. It is not a secret: the token is what authorises, not obscurity.
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
 * Resolve config from the environment.
 *
 * Fails closed on every missing or unusable value rather than defaulting.
 * A generated-on-the-fly token would defeat pairing (the panel could not know
 * it), and a guessed extension id would let any extension connect — so both are
 * required, and the error says what to set.
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

  return { ok: true, config: { port, host, token, extensionId } };
}

function parsePort(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === "") return DEFAULT_PORT;
  // `Number` rather than `parseInt`: parseInt("80abc") is 80, which would bind
  // a port the user never asked for.
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 65535) return null;
  return n;
}
