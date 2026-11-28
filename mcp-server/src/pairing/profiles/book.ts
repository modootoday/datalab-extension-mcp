/**
 * The paired profiles in memory, backed by the profile record. The older
 * single-pairing file is read in once, only while no profile record exists.
 */
import { timingSafeEqual } from "@modootoday/datalab-extension-app-mcp-core";

import { digestToken } from "../../token-digest.js";
import {
  deletePairingRecord,
  readPairingRecord,
  writePairingRecord,
} from "../record.js";
import {
  MAX_BROWSERS_PER_PROFILE,
  readProfiles,
  writeProfiles,
  type ProfileEntry,
} from "./record.js";

export type AddOutcome = "added" | "exists" | "revoked" | "full" | "corrupt";
export type BindOutcome =
  | "bound"
  | "taken"
  | "full"
  | "record_full"
  | "corrupt";

export interface ProfileBook {
  /** A corrupt record holds no usable profile and admits none. */
  readonly corrupt: boolean;
  count(): number;
  list(): readonly ProfileEntry[];
  /** The profile whose key this is, or null. */
  match(presented: string): ProfileEntry | null;
  /** Whether this key belonged to a profile that was unpaired. */
  isRevoked(presented: string): boolean;
  /** The digest of the profile this browser id is bound to, or null. */
  ownerOf(browserId: string): string | null;
  /** Whether any profile has no browser bound yet. */
  hasUnbound(): boolean;
  add(token: string, pairedAt: string): AddOutcome;
  bind(digest: string, browserId: string): BindOutcome;
  /** Keep the name the panel shows for this profile; written only when it changes. */
  setLabel(digest: string, label: string): void;
  revoke(digest: string): boolean;
}

export interface ProfileBookOptions {
  home?: string;
  log?: (message: string) => void;
}

interface Loaded {
  profiles: ProfileEntry[];
  revoked: string[];
}

function loadOnce(options: ProfileBookOptions): Loaded | null {
  const read = readProfiles(options.home);
  if (read.kind === "ready") {
    return { profiles: read.profiles, revoked: read.revoked };
  }
  if (read.kind === "corrupt") {
    options.log?.("the profile record cannot be read; refusing new pairings");
    return null;
  }
  const legacy = readPairingRecord(options.home);
  if (legacy === null) return { profiles: [], revoked: [] };
  const imported: ProfileEntry[] = [
    {
      digest: digestToken(legacy.token),
      pairedAt: legacy.pairedAt,
      browserIds: [],
    },
  ];
  if (writeProfiles(imported, options.home) !== "written") {
    options.log?.(
      "could not write the profile record; imported for this run only",
    );
  }
  return { profiles: imported, revoked: [] };
}

export function createProfileBook(
  options: ProfileBookOptions = {},
): ProfileBook {
  const loaded = loadOnce(options);
  const corrupt = loaded === null;
  const profiles: ProfileEntry[] = loaded?.profiles ?? [];
  const revoked: string[] = loaded?.revoked ?? [];

  const byDigest = (digest: string): ProfileEntry | undefined =>
    profiles.find((entry) => timingSafeEqual(entry.digest, digest));
  const revokedDigest = (digest: string): boolean =>
    revoked.some((entry) => timingSafeEqual(entry, digest));

  /** A record that would pass its cap is neither written nor kept. */
  const persist = (next: readonly ProfileEntry[]): "kept" | "too_large" => {
    const written = writeProfiles(next, options.home, revoked);
    if (written === "too_large") return "too_large";
    if (written === "failed") {
      options.log?.(
        "could not write the profile record; kept for this run only",
      );
    }
    return "kept";
  };

  return {
    corrupt,
    count: () => profiles.length,
    list: () => profiles,
    match(presented) {
      if (corrupt) return null;
      return byDigest(digestToken(presented)) ?? null;
    },
    isRevoked: (presented) => revokedDigest(digestToken(presented)),
    ownerOf(browserId) {
      const owner = profiles.find((entry) =>
        entry.browserIds.includes(browserId),
      );
      return owner?.digest ?? null;
    },
    hasUnbound: () => profiles.some((entry) => entry.browserIds.length === 0),
    add(token, pairedAt) {
      if (corrupt) return "corrupt";
      const digest = digestToken(token);
      if (byDigest(digest) !== undefined) return "exists";
      if (revokedDigest(digest)) return "revoked";
      const entry: ProfileEntry = { digest, pairedAt, browserIds: [] };
      if (persist([...profiles, entry]) === "too_large") return "full";
      const first = profiles.length === 0;
      profiles.push(entry);
      // The older reader understands one pairing only; it keeps the first.
      if (first && readPairingRecord(options.home) === null) {
        writePairingRecord({ token, pairedAt }, options.home);
      }
      return "added";
    },
    bind(digest, browserId) {
      if (corrupt) return "corrupt";
      const entry = byDigest(digest);
      if (entry === undefined) return "taken";
      if (entry.browserIds.includes(browserId)) return "bound";
      const owner = profiles.find((other) =>
        other.browserIds.includes(browserId),
      );
      if (owner !== undefined) return "taken";
      if (entry.browserIds.length >= MAX_BROWSERS_PER_PROFILE) return "full";
      const next = profiles.map((other) =>
        other === entry
          ? { ...other, browserIds: [...other.browserIds, browserId] }
          : other,
      );
      if (persist(next) === "too_large") return "record_full";
      entry.browserIds.push(browserId);
      return "bound";
    },
    setLabel(digest, label) {
      if (corrupt) return;
      const entry = byDigest(digest);
      if (entry === undefined || entry.label === label) return;
      const next = profiles.map((other) =>
        other === entry ? { ...other, label } : other,
      );
      if (persist(next) === "too_large") return;
      entry.label = label;
    },
    revoke(digest) {
      if (corrupt) return false;
      const index = profiles.findIndex((entry) =>
        timingSafeEqual(entry.digest, digest),
      );
      if (index < 0) return false;
      // Removed first, so an older build after a downgrade lands unpaired
      // rather than trusting the revoked key.
      const legacy = readPairingRecord(options.home);
      if (legacy !== null && digestToken(legacy.token) === digest) {
        deletePairingRecord(options.home);
      }
      // Forgotten in memory only once the disk agrees, or the profile would
      // come back on the next start.
      const remaining = profiles.filter((_, i) => i !== index);
      const written = writeProfiles(remaining, options.home, [
        ...revoked,
        digest,
      ]);
      if (written !== "written") {
        options.log?.(
          "could not write the profile record; the unpair did not stick",
        );
        return false;
      }
      profiles.splice(index, 1);
      revoked.push(digest);
      return true;
    },
  };
}
