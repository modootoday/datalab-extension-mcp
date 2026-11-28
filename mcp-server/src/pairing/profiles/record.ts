/**
 * The profile record: one entry per paired browser profile, identified by the
 * digest of its key and never by the key itself. Owner-only, replaced whole.
 */
import { readFileSync, renameSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { logDir } from "../../log-file.js";
import { writeOwnerOnly } from "../../owner-file/index.js";

const FILE_NAME = "pairings.json";
const DIGEST = /^[0-9a-f]{64}$/;

/** Browser ids one profile holds at most. */
export const MAX_BROWSERS_PER_PROFILE = 8;

/** Larger reads as corrupt, and a write that would pass it is refused. */
export const MAX_RECORD_BYTES = 1024 * 1024;

export interface ProfileEntry {
  digest: string;
  pairedAt: string;
  label?: string;
  browserIds: string[];
}

export type ProfilesRead =
  | { kind: "absent" }
  | { kind: "ready"; profiles: ProfileEntry[]; revoked: string[] }
  | { kind: "corrupt" };

export type ProfilesWrite = "written" | "too_large" | "failed";

export function profilesPath(home: string = homedir()): string {
  return join(logDir(home), FILE_NAME);
}

function parseEntry(value: unknown): ProfileEntry | null {
  if (typeof value !== "object" || value === null) return null;
  const { digest, pairedAt, label, browserIds } = value as Record<
    string,
    unknown
  >;
  if (typeof digest !== "string" || !DIGEST.test(digest)) return null;
  if (typeof pairedAt !== "string") return null;
  if (label !== undefined && typeof label !== "string") return null;
  if (!Array.isArray(browserIds)) return null;
  if (browserIds.length > MAX_BROWSERS_PER_PROFILE) return null;
  if (!browserIds.every((id) => typeof id === "string" && id.length > 0)) {
    return null;
  }
  return {
    digest,
    pairedAt,
    ...(label === undefined ? {} : { label }),
    browserIds: [...(browserIds as string[])],
  };
}

function parseRevoked(value: unknown, live: Set<string>): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const seen = new Set<string>();
  for (const digest of value) {
    if (typeof digest !== "string" || !DIGEST.test(digest)) return null;
    if (seen.has(digest) || live.has(digest)) return null;
    seen.add(digest);
  }
  return [...seen];
}

function readCapped(path: string): string | "absent" | "corrupt" {
  try {
    if (statSync(path).size > MAX_RECORD_BYTES) return "corrupt";
    return readFileSync(path, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code === "ENOENT" ? "absent" : "corrupt";
  }
}

/** Absent only when the file is not there; any other failure is corrupt. */
export function readProfiles(home: string = homedir()): ProfilesRead {
  const raw = readCapped(profilesPath(home));
  if (raw === "absent") return { kind: "absent" };
  if (raw === "corrupt") return { kind: "corrupt" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: "corrupt" };
  }
  if (typeof parsed !== "object" || parsed === null) return { kind: "corrupt" };
  const { version, profiles, revoked } = parsed as Record<string, unknown>;
  if (version !== 1 || !Array.isArray(profiles)) return { kind: "corrupt" };
  const entries: ProfileEntry[] = [];
  const seenDigests = new Set<string>();
  const seenBrowsers = new Set<string>();
  for (const value of profiles) {
    const entry = parseEntry(value);
    if (entry === null || seenDigests.has(entry.digest)) {
      return { kind: "corrupt" };
    }
    seenDigests.add(entry.digest);
    for (const id of entry.browserIds) {
      if (seenBrowsers.has(id)) return { kind: "corrupt" };
      seenBrowsers.add(id);
    }
    entries.push(entry);
  }
  const revokedDigests = parseRevoked(revoked, seenDigests);
  if (revokedDigests === null) return { kind: "corrupt" };
  return { kind: "ready", profiles: entries, revoked: revokedDigests };
}

/** Written beside the target and renamed over it, so a reader never sees half. */
export function writeProfiles(
  profiles: readonly ProfileEntry[],
  home: string = homedir(),
  revoked: readonly string[] = [],
): ProfilesWrite {
  const body = `${JSON.stringify({
    version: 1,
    profiles,
    ...(revoked.length === 0 ? {} : { revoked }),
  })}\n`;
  if (Buffer.byteLength(body, "utf8") > MAX_RECORD_BYTES) return "too_large";
  const path = profilesPath(home);
  const temp = `${path}.${process.pid.toString(36)}.tmp`;
  try {
    writeOwnerOnly(temp, body);
    renameSync(temp, path);
    return "written";
  } catch {
    rmSync(temp, { force: true });
    return "failed";
  }
}

/** Remove the record. Returns whether one was there. */
export function deleteProfiles(home: string = homedir()): boolean {
  const path = profilesPath(home);
  try {
    readFileSync(path);
  } catch {
    return false;
  }
  rmSync(path, { force: true });
  return true;
}
