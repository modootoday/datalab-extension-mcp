/**
 * A token as the registry stores it.
 *
 * The one place a token becomes a digest, so the file and the handshake can
 * never disagree about what a row means. Its own module because the handshake
 * needs it and has no business reading the registry — importing a ledger to
 * hash a string is the kind of dependency that later reads as one.
 *
 * Plain SHA-256: the input is a high-entropy token we minted, not a password,
 * so a slow KDF buys nothing and would be paid on every handshake.
 */
import { createHash } from "node:crypto";

export function digestToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
