/** What a panel is told when its handshake fails the pairing check. */
import type { HelloNack } from "@modootoday/datalab-extension-app-mcp-core";

import type { AdmissionRefusal } from "./root-credential.js";

const MESSAGES: Record<Exclude<AdmissionRefusal, "unauthorized">, string> = {
  paired_elsewhere:
    "This browser is already connected with another key. Run datalab-extension-mcp unpair, then open the side panel again.",
  browser_limit:
    "This profile's key is already used by the most browsers one key may serve. Unpair one of them first.",
  record_unreadable:
    "The connector cannot read its pairing record. Run datalab-extension-mcp unpair, then open the side panel again.",
  record_full:
    "The connector has no room for another browser. Run datalab-extension-mcp list, unpair a profile you no longer use with datalab-extension-mcp unpair <name>, then open the side panel again.",
  revoked:
    "This browser was disconnected. Connect again from the side panel's settings.",
  pairing_busy:
    "Many browsers asked to connect in the last minute. Wait a minute, then open the side panel again.",
};

/** Null leaves the coarse unauthorized answer, which explains nothing. */
export function pairingRefusal(reason: AdmissionRefusal): HelloNack | null {
  if (reason === "unauthorized") return null;
  return { t: "hello_nack", reason, supported: [], message: MESSAGES[reason] };
}
