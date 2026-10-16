/**
 * Bridge version negotiation — pure.
 *
 * Modelled on MCP's own initialize handshake: the client offers versions, the
 * server picks one it also speaks, and a mismatch is a structured refusal
 * carrying what the server DOES support — never a dead socket. npm and the
 * Chrome Web Store publish on independent schedules, so skew is the steady
 * state rather than an edge case.
 */
import { SUPPORTED_PROTOCOL_VERSIONS } from "./protocol.js";

export type NegotiateOutcome =
  | { ok: true; version: number }
  | {
      ok: false;
      reason: "version_mismatch";
      supported: number[];
      message: string;
    };

/**
 * Pick the highest version both sides speak.
 *
 * Highest-common rather than newest-offered: an extension that learns a new
 * version must still work against a server that has not been updated, which is
 * the common direction of skew.
 */
export function negotiateProtocol(
  offered: readonly number[],
  supported: readonly number[] = SUPPORTED_PROTOCOL_VERSIONS,
): NegotiateOutcome {
  const common = offered.filter((v) => supported.includes(v));
  if (common.length > 0) {
    return { ok: true, version: Math.max(...common) };
  }
  return {
    ok: false,
    reason: "version_mismatch",
    supported: [...supported],
    message: describeMismatch(offered, supported),
  };
}

/**
 * Turn a mismatch into a sentence that names the fix. This string reaches the
 * operator, so it says which side is behind rather than dumping two arrays.
 */
function describeMismatch(
  offered: readonly number[],
  supported: readonly number[],
): string {
  const maxOffered = offered.length > 0 ? Math.max(...offered) : 0;
  const maxSupported = supported.length > 0 ? Math.max(...supported) : 0;

  if (maxOffered > maxSupported) {
    return `The MCP server is out of date: it speaks bridge protocol v${maxSupported}, the extension needs v${maxOffered}. Update the server package.`;
  }
  return `The extension is out of date: it speaks bridge protocol v${maxOffered}, the server needs v${maxSupported}. Update the extension.`;
}
