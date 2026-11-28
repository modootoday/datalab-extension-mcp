/**
 * The machine's credential: a token given in the environment, or the keys of
 * the browser profiles that paired with this connector.
 */
import {
  MIN_TOKEN_LENGTH,
  checkToken,
} from "@modootoday/datalab-extension-app-mcp-core";

import { digestToken } from "../token-digest.js";
import { createProfileBook, type ProfileBook } from "./profiles/index.js";

/** New profiles one daemon run accepts per minute. */
export const PROFILE_ADDS_PER_MINUTE = 10;
const ADD_WINDOW_MS = 60 * 1000;

export type AdmissionRefusal =
  | "unauthorized"
  | "paired_elsewhere"
  | "browser_limit"
  | "record_unreadable"
  | "record_full"
  | "revoked"
  | "pairing_busy";

export type Enrollment =
  | { kind: "known"; digest: string }
  | { kind: "refused"; reason: AdmissionRefusal };

export type Admission =
  | { kind: "admitted"; digest: string }
  | { kind: "refused"; reason: AdmissionRefusal };

export type Unpairing =
  | { kind: "unpaired"; digest: string; label: string | null }
  | { kind: "not_saved" }
  | { kind: "unknown" };

export interface RootCredential {
  /** Keep the label a panel reported for its profile. */
  label(digest: string, label: string): void;
  /** Forget the profile this key belongs to; other profiles stay paired. */
  unpair(presented: string): Unpairing;
  /** Whether any profile is paired, or the record cannot be read. */
  paired(): boolean;
  /** Whether this key belongs to a paired profile, or is the environment token. */
  matches(presented: string): boolean;
  /** Whether this value is the environment token; a profile key never is. */
  authorizes(presented: string): boolean;
  /** The profile this key belongs to, adding it when it is new. */
  enroll(presented: string): Enrollment;
  /** Admit a named browser's handshake, binding its id to the key's profile. */
  admit(presented: string, browserId: string | undefined): Admission;
  /** Where the credential came from: the environment, or side panels. */
  readonly source: "environment" | "side_panel";
}

/** A credential given up front; it never changes and never adds a profile. */
export function fixedRoot(token: string): RootCredential {
  const matches = (presented: string): boolean =>
    checkToken(presented, token).ok;
  const enroll = (presented: string): Enrollment =>
    matches(presented)
      ? { kind: "known", digest: digestToken(presented) }
      : { kind: "refused", reason: "unauthorized" };
  return {
    source: "environment",
    label: () => {},
    unpair: () => ({ kind: "unknown" }),
    paired: () => true,
    matches,
    authorizes: matches,
    enroll,
    admit(presented, browserId) {
      if (browserId === undefined || browserId.length === 0) {
        return { kind: "refused", reason: "unauthorized" };
      }
      const enrolled = enroll(presented);
      if (enrolled.kind === "refused") return enrolled;
      return { kind: "admitted", digest: enrolled.digest };
    },
  };
}

export interface PairingRootOptions {
  home?: string;
  now?: () => number;
  addsPerMinute?: number;
  log?: (message: string) => void;
  /** Injected in tests; built from home and log otherwise. */
  profiles?: ProfileBook;
}

export function pairingRoot(options: PairingRootOptions = {}): RootCredential {
  const now = options.now ?? Date.now;
  const addsPerMinute = options.addsPerMinute ?? PROFILE_ADDS_PER_MINUTE;
  const book =
    options.profiles ??
    createProfileBook({ home: options.home, log: options.log });
  const recentAdds: number[] = [];

  const paired = (): boolean => book.corrupt || book.count() > 0;

  const addAllowed = (): boolean => {
    const cutoff = now() - ADD_WINDOW_MS;
    while (recentAdds.length > 0 && (recentAdds[0] ?? 0) <= cutoff) {
      recentAdds.shift();
    }
    return recentAdds.length < addsPerMinute;
  };

  const enroll = (presented: string): Enrollment => {
    if (book.corrupt) return { kind: "refused", reason: "record_unreadable" };
    const known = book.match(presented);
    if (known !== null) return { kind: "known", digest: known.digest };
    if (presented.length < MIN_TOKEN_LENGTH) {
      return { kind: "refused", reason: "unauthorized" };
    }
    if (book.isRevoked(presented)) {
      return { kind: "refused", reason: "revoked" };
    }
    if (!addAllowed()) return { kind: "refused", reason: "pairing_busy" };
    const outcome = book.add(presented, new Date(now()).toISOString());
    if (outcome === "full") return { kind: "refused", reason: "record_full" };
    if (outcome === "revoked") return { kind: "refused", reason: "revoked" };
    if (outcome === "corrupt") {
      return { kind: "refused", reason: "record_unreadable" };
    }
    if (outcome === "added") {
      recentAdds.push(now());
      options.log?.("paired with a new browser profile");
    }
    return { kind: "known", digest: digestToken(presented) };
  };

  return {
    source: "side_panel",
    label: (digest, label) => book.setLabel(digest, label),
    unpair(presented) {
      // Matched, never enrolled: an unknown key must not pair on its way out.
      const entry = book.match(presented);
      if (entry === null) return { kind: "unknown" };
      const label = entry.label ?? null;
      if (!book.revoke(entry.digest)) return { kind: "not_saved" };
      return { kind: "unpaired", digest: entry.digest, label };
    },
    paired,
    matches: (presented) => book.match(presented) !== null,
    authorizes: () => false,
    enroll,
    admit(presented, browserId) {
      if (browserId === undefined || browserId.length === 0) {
        return { kind: "refused", reason: "unauthorized" };
      }
      // A bound id with another key is someone else's browser; it never adds
      // a profile on the way to being refused.
      const owner = book.ownerOf(browserId);
      if (owner !== null && book.match(presented)?.digest !== owner) {
        return { kind: "refused", reason: "paired_elsewhere" };
      }
      const enrolled = enroll(presented);
      if (enrolled.kind === "refused") return enrolled;
      const bound = book.bind(enrolled.digest, browserId);
      if (bound === "taken")
        return { kind: "refused", reason: "paired_elsewhere" };
      if (bound === "full") return { kind: "refused", reason: "browser_limit" };
      if (bound === "record_full") {
        return { kind: "refused", reason: "record_full" };
      }
      if (bound === "corrupt")
        return { kind: "refused", reason: "record_unreadable" };
      return { kind: "admitted", digest: enrolled.digest };
    },
  };
}
