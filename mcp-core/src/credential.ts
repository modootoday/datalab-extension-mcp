/**
 * Which credential a handshake presented, decided once.
 *
 * One secret per machine: the pairing token the connector was started with.
 * A browser that holds it may open a session, and the name it gives is a
 * routing label, not a permission.
 */
import { checkToken } from "./auth.js";

export type Credential =
  | { kind: "claimed"; browserId: string }
  | {
      kind: "refused";
      reason: "unauthorized" | "browser_registration_required";
      message: string;
    };

export interface PresentedCredential {
  token: string;
  /**
   * Which browser this is, for routing and for the session key. Self-asserted:
   * the token is what authorises, and a name that authorised nothing cannot be
   * forged into anything.
   */
  browserId: string | undefined;
}

export interface KnownCredentials {
  /** The pairing token this server was started with. */
  rootToken: string;
}

const REFUSED: Credential = {
  kind: "refused",
  reason: "unauthorized",
  message: "Pairing token missing or invalid.",
};

export function resolveCredential(
  presented: PresentedCredential,
  known: KnownCredentials,
): Credential {
  if (!checkToken(presented.token, known.rootToken).ok) return REFUSED;
  const { browserId } = presented;
  // Routing needs a key per browser, and every session is one. A handshake
  // that names nothing cannot be addressed, so it is not admitted either.
  if (browserId === undefined || browserId.length === 0) return REFUSED;
  return { kind: "claimed", browserId };
}
