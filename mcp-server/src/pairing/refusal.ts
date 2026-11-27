/** Why a named browser's handshake fails the pairing check, when a panel can act on it. */
import {
  MIN_TOKEN_LENGTH,
  checkToken,
  type HelloNack,
} from "@modootoday/datalab-extension-app-mcp-core";

import type { RootCredential } from "./root-credential.js";

const PAIRED_ELSEWHERE =
  "This connector is paired with another browser. Copy the connection key from that browser's settings into this browser's settings.";
const WINDOW_CLOSED =
  "The pairing window has ended. Restart your AI app, then open the side panel within 10 minutes.";

function nack(reason: HelloNack["reason"], message: string): HelloNack {
  return { t: "hello_nack", reason, supported: [], message };
}

/**
 * Null leaves the coarse unauthorized answer. A token from the environment is
 * never explained: only a side panel's claim is a pairing a panel can follow.
 */
export function pairingRefusal(
  root: RootCredential,
  presented: string,
  browserId: string | undefined,
): HelloNack | null {
  if (browserId === undefined || browserId.length === 0) return null;
  const held = root.current();
  if (held === null) {
    if (root.acceptsClaim()) return null;
    return nack("window_closed", WINDOW_CLOSED);
  }
  if (root.source !== "side_panel") return null;
  if (presented.length < MIN_TOKEN_LENGTH) return null;
  if (checkToken(presented, held).ok) return null;
  return nack("paired_elsewhere", PAIRED_ELSEWHERE);
}
