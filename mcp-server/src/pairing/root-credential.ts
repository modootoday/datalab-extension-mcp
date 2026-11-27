/**
 * The machine's root credential: a token given in the environment, or the
 * token of the first side panel that claims an unpaired connector.
 */
import { MIN_TOKEN_LENGTH } from "@modootoday/datalab-extension-app-mcp-core";

import { readPairingRecord, writePairingRecord } from "./record.js";

/** How long after start an unpaired connector accepts a claim. */
export const CLAIM_WINDOW_MS = 10 * 60 * 1000;

export type ClaimOutcome =
  | "claimed"
  | "already_paired"
  | "window_closed"
  | "invalid_token";

export interface RootCredential {
  /** The token that authorises, or null while unpaired. */
  current(): string | null;
  /** Pair with this token when unpaired and inside the claim window. */
  claim(token: string): ClaimOutcome;
  /** Epoch ms when an unpaired connector stops accepting a claim; null once paired. */
  windowEndsAt(): number | null;
  /** Whether a claim could still pair this connector right now. */
  acceptsClaim(): boolean;
  /** Where the token came from: the environment, or a side panel's claim. */
  readonly source: "environment" | "side_panel";
}

/** A credential given up front; it never changes and never accepts a claim. */
export function fixedRoot(token: string): RootCredential {
  return {
    source: "environment",
    current: () => token,
    claim: () => "already_paired",
    windowEndsAt: () => null,
    acceptsClaim: () => false,
  };
}

export interface PairingRootOptions {
  home?: string;
  now?: () => number;
  windowMs?: number;
  log?: (message: string) => void;
}

export function pairingRoot(options: PairingRootOptions = {}): RootCredential {
  const now = options.now ?? Date.now;
  const windowMs = options.windowMs ?? CLAIM_WINDOW_MS;
  const startedAt = now();
  let token = readPairingRecord(options.home)?.token ?? null;

  return {
    source: "side_panel",
    current: () => token,
    windowEndsAt: () => (token === null ? startedAt + windowMs : null),
    acceptsClaim: () => token === null && now() - startedAt <= windowMs,
    claim(presented) {
      if (token !== null) return "already_paired";
      if (now() - startedAt > windowMs) return "window_closed";
      if (presented.length < MIN_TOKEN_LENGTH) return "invalid_token";
      const pairedAt = new Date(now()).toISOString();
      if (!writePairingRecord({ token: presented, pairedAt }, options.home)) {
        options.log?.(
          "could not write the pairing record; paired for this run only",
        );
      }
      token = presented;
      return "claimed";
    },
  };
}
