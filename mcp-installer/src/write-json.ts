/**
 * The hygiene floor for every Tier-2 file write. All seven steps, in order:
 *
 *   1. read the file immediately before writing — host apps are known to
 *      rewrite their own configs while running, so a value cached across the
 *      Y/n prompt could clobber a newer file
 *   2. JSON.parse; a file that exists but does not parse is REFUSED — the
 *      caller prints the path and a snippet instead. Rewriting a config we
 *      could not read is how other people's apps get broken.
 *   3. merge ONLY `mcpServers.datalab` — every unknown key anywhere in the
 *      document is somebody else's state and is preserved verbatim
 *   4. timestamped backup first, newest three kept
 *   5. temp file in the SAME directory + atomic rename (cross-device rename
 *      is not atomic, a sibling always is)
 *   6. re-read + re-parse after the rename; on verification failure the
 *      newest backup is restored automatically
 *   7. per-host isolation is the caller's job — this module reports outcomes,
 *      it never throws for expected refusals
 */
import { SERVER_NAME, type FileServerEntry } from "./hosts.js";
import type { Io } from "./types.js";

export const BACKUP_KEEP = 3;

export type WriteRefusal = "parse" | "verify" | "missing";

export interface WriteOutcome {
  ok: boolean;
  /** false when there was nothing to do (uninstall with no entry present). */
  changed: boolean;
  backupPath?: string;
  reason?: WriteRefusal;
}

interface JsonDocState {
  exists: boolean;
  raw: string;
  doc: Record<string, unknown> | null;
  parseError: boolean;
}

/** yyyymmddhhmmss in UTC — sorts lexicographically, which rotation relies on. */
export function formatBackupTimestamp(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return (
    String(date.getUTCFullYear()) +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds())
  );
}

function splitPath(filePath: string): { dir: string; base: string } {
  const cut = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  if (cut < 0) {
    return { dir: ".", base: filePath };
  }
  return { dir: filePath.slice(0, cut), base: filePath.slice(cut + 1) };
}

function joinDir(dir: string, name: string): string {
  if (dir.includes("\\") && !dir.includes("/")) {
    return `${dir}\\${name}`;
  }
  return `${dir}/${name}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return true;
}

async function readDoc(io: Io, filePath: string): Promise<JsonDocState> {
  if (!(await io.exists(filePath))) {
    return { exists: false, raw: "", doc: null, parseError: false };
  }
  const raw = await io.readFile(filePath);
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) {
      // A top-level array/string is valid JSON but not a config document we
      // understand — merging into it would destroy it, so treat as unparseable.
      return { exists: true, raw, doc: null, parseError: true };
    }
    return { exists: true, raw, doc: parsed, parseError: false };
  } catch {
    return { exists: true, raw, doc: null, parseError: true };
  }
}

function serialize(doc: Record<string, unknown>): string {
  return `${JSON.stringify(doc, null, 2)}\n`;
}

async function atomicWrite(
  io: Io,
  filePath: string,
  content: string,
): Promise<void> {
  const tempPath = `${filePath}.tmp-${formatBackupTimestamp(io.now())}`;
  await io.writeFile(tempPath, content);
  await io.rename(tempPath, filePath);
}

/**
 * Copies the current raw bytes aside, then prunes everything past the newest
 * BACKUP_KEEP. Runs BEFORE the mutating write so a crash mid-write still
 * leaves the original recoverable.
 */
async function writeBackup(
  io: Io,
  filePath: string,
  raw: string,
): Promise<string> {
  const { dir, base } = splitPath(filePath);
  const timestamp = formatBackupTimestamp(io.now());
  const backupPath = joinDir(dir, `${base}.backup-${timestamp}`);
  await io.writeFile(backupPath, raw);

  const prefix = `${base}.backup-`;
  const names = await io.listBackups(dir);
  const backups = names
    .filter((name) => {
      if (!name.startsWith(prefix)) {
        return false;
      }
      return /^\d{14}$/.test(name.slice(prefix.length));
    })
    .sort();
  const excess = backups.slice(0, Math.max(0, backups.length - BACKUP_KEEP));
  for (const name of excess) {
    await io.unlink(joinDir(dir, name));
  }
  return backupPath;
}

async function findNewestBackup(
  io: Io,
  filePath: string,
): Promise<string | null> {
  const { dir, base } = splitPath(filePath);
  const prefix = `${base}.backup-`;
  const names = await io.listBackups(dir);
  const backups = names
    .filter((name) => {
      if (!name.startsWith(prefix)) {
        return false;
      }
      return /^\d{14}$/.test(name.slice(prefix.length));
    })
    .sort();
  const newest = backups[backups.length - 1];
  if (newest === undefined) {
    return null;
  }
  return joinDir(dir, newest);
}

async function restoreNewestBackup(io: Io, filePath: string): Promise<boolean> {
  const backupPath = await findNewestBackup(io, filePath);
  if (backupPath === null) {
    return false;
  }
  const raw = await io.readFile(backupPath);
  await atomicWrite(io, filePath, raw);
  return true;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) {
      return false;
    }
    return keysA.every((key) => deepEqual(a[key], b[key]));
  }
  return false;
}

/**
 * Install path: merges `mcpServers.datalab` into the file. When the file does
 * not exist yet (but its parent app directory does — the caller's detection
 * guarantees that), a fresh minimal document is created; no backup then,
 * because there is nothing to back up.
 */
export async function upsertServerKey(
  io: Io,
  filePath: string,
  entry: FileServerEntry,
): Promise<WriteOutcome> {
  const state = await readDoc(io, filePath);
  if (state.parseError) {
    // Never write over a file we could not read — and never leave a backup of
    // a refusal either; a refused host must leave the directory untouched.
    return { ok: false, changed: false, reason: "parse" };
  }

  let doc: Record<string, unknown>;
  if (state.doc !== null) {
    doc = state.doc;
  } else {
    doc = {};
  }

  const existingServers = doc["mcpServers"];
  let servers: Record<string, unknown>;
  if (existingServers === undefined) {
    servers = {};
  } else if (isPlainObject(existingServers)) {
    servers = existingServers;
  } else {
    // mcpServers exists but is not an object — same refusal class as a parse
    // failure: we cannot merge without destroying someone's data.
    return { ok: false, changed: false, reason: "parse" };
  }
  doc["mcpServers"] = servers;
  servers[SERVER_NAME] = entry;

  let backupPath: string | undefined;
  if (state.exists) {
    backupPath = await writeBackup(io, filePath, state.raw);
  }

  await atomicWrite(io, filePath, serialize(doc));

  const after = await readDoc(io, filePath);
  let verified = false;
  if (after.doc !== null) {
    const afterServers = after.doc["mcpServers"];
    if (isPlainObject(afterServers)) {
      verified = deepEqual(afterServers[SERVER_NAME], entry);
    }
  }
  if (!verified) {
    if (backupPath !== undefined) {
      await restoreNewestBackup(io, filePath);
    }
    if (backupPath !== undefined) {
      return { ok: false, changed: false, reason: "verify", backupPath };
    }
    return { ok: false, changed: false, reason: "verify" };
  }
  if (backupPath !== undefined) {
    return { ok: true, changed: true, backupPath };
  }
  return { ok: true, changed: true };
}

/**
 * Uninstall path: deletes ONLY `mcpServers.datalab`. An emptied mcpServers
 * object is left in place — removing it would be touching a key we do not own.
 */
export async function removeServerKey(
  io: Io,
  filePath: string,
): Promise<WriteOutcome> {
  const state = await readDoc(io, filePath);
  if (!state.exists) {
    return { ok: true, changed: false, reason: "missing" };
  }
  if (state.parseError || state.doc === null) {
    return { ok: false, changed: false, reason: "parse" };
  }

  const servers = state.doc["mcpServers"];
  if (!isPlainObject(servers) || !(SERVER_NAME in servers)) {
    return { ok: true, changed: false, reason: "missing" };
  }
  delete servers[SERVER_NAME];

  const backupPath = await writeBackup(io, filePath, state.raw);
  await atomicWrite(io, filePath, serialize(state.doc));

  const after = await readDoc(io, filePath);
  let verified = false;
  if (after.doc !== null) {
    const afterServers = after.doc["mcpServers"];
    if (isPlainObject(afterServers)) {
      verified = !(SERVER_NAME in afterServers);
    } else if (afterServers === undefined) {
      verified = true;
    }
  }
  if (!verified) {
    await restoreNewestBackup(io, filePath);
    return { ok: false, changed: false, reason: "verify", backupPath };
  }
  return { ok: true, changed: true, backupPath };
}
