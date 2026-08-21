/**
 * Placing a skill directory — the directory analog of {@link ./write-json.js}.
 *
 * `~/.agents/skills/` is read by nine hosts and written by other tools too
 * (`gh skill install`, a manual clone). So ownership is proven, never assumed:
 * a marker records what we wrote, and anything we cannot prove is ours is left
 * alone. Reciprocity is not assumed — no other tool knows our marker.
 */
import type { Io } from "./types.js";

/** Written last on install, read first on uninstall. */
export const MARKER_NAME = ".datalab-installed.json";

export type DirRefusal =
  | "foreign" // a marker exists but names another source
  | "unmarked" // the directory exists with no marker
  | "unreadable"; // a marker exists and could not be parsed

export interface DirOutcome {
  ok: boolean;
  path: string;
  refusal?: DirRefusal;
  /** Files actually written or removed. */
  files: string[];
}

export interface SkillPayload {
  slug: string;
  /** Relative path under the skill directory → file content. */
  files: ReadonlyMap<string, string>;
}

interface Marker {
  source: string;
  version: string;
  installedAt: string;
  /** The list is the ownership proof — removal deletes only these. */
  files: string[];
}

const SOURCE = "@modootoday/datalab-extension-mcp";

function join(io: Io, ...parts: string[]): string {
  return io.platform === "win32" ? parts.join("\\") : parts.join("/");
}

/** Directory portion of a relative path, or "" for a file at the root. */
function dirOf(rel: string): string {
  const cut = rel.lastIndexOf("/");
  return cut === -1 ? "" : rel.slice(0, cut);
}

async function readMarker(
  io: Io,
  dir: string,
): Promise<Marker | "none" | "bad"> {
  const path = join(io, dir, MARKER_NAME);
  if (!(await io.exists(path))) {
    return "none";
  }
  let raw: string;
  try {
    raw = await io.readFile(path);
  } catch {
    return "bad";
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as Marker).source !== "string" ||
      !Array.isArray((parsed as Marker).files)
    ) {
      return "bad";
    }
    return parsed as Marker;
  } catch {
    return "bad";
  }
}

/** What a skill directory is, without changing it. */
export type DirState =
  | { kind: "absent" }
  | { kind: "refused"; refusal: DirRefusal }
  | { kind: "ours"; version: string; installedAt: string };

/**
 * Read-only counterpart to the two writers below.
 *
 * Goes through the same `readMarker`, so a directory reported as ours here is
 * exactly one the writers would agree to touch.
 */
export async function inspectSkillDir(
  io: Io,
  root: string,
  slug: string,
): Promise<DirState> {
  const dir = join(io, root, slug);
  if (!(await io.exists(dir))) {
    return { kind: "absent" };
  }
  const marker = await readMarker(io, dir);
  if (marker === "none") return { kind: "refused", refusal: "unmarked" };
  if (marker === "bad") return { kind: "refused", refusal: "unreadable" };
  if (marker.source !== SOURCE) return { kind: "refused", refusal: "foreign" };
  return {
    kind: "ours",
    version: marker.version,
    installedAt: marker.installedAt,
  };
}

/**
 * Place one skill under `root`.
 *
 * The marker is written LAST. A crash mid-copy then leaves a directory with
 * no marker, which the next run refuses to touch — the safe outcome. Writing it
 * first would make a half-copied directory look like ours to delete.
 */
export async function installSkillDir(
  io: Io,
  root: string,
  payload: SkillPayload,
  version: string,
): Promise<DirOutcome> {
  const dir = join(io, root, payload.slug);
  const files: string[] = [];

  if (await io.exists(dir)) {
    const marker = await readMarker(io, dir);
    if (marker === "none") {
      return { ok: false, path: dir, refusal: "unmarked", files };
    }
    if (marker === "bad") {
      return { ok: false, path: dir, refusal: "unreadable", files };
    }
    if (marker.source !== SOURCE) {
      return { ok: false, path: dir, refusal: "foreign", files };
    }
    // Ours — a re-install or version bump overwrites, same rule upsertServerKey
    // applies to a key it already owns.
  }

  await io.mkdir(dir);
  for (const [rel, content] of payload.files) {
    const sub = dirOf(rel);
    if (sub !== "") {
      await io.mkdir(join(io, dir, ...sub.split("/")));
    }
    await io.writeFile(join(io, dir, ...rel.split("/")), content);
    files.push(rel);
  }

  const marker: Marker = {
    source: SOURCE,
    version,
    installedAt: io.now().toISOString(),
    files,
  };
  await io.writeFile(
    join(io, dir, MARKER_NAME),
    `${JSON.stringify(marker, null, 2)}\n`,
  );
  return { ok: true, path: dir, files };
}

/**
 * Remove one skill we placed.
 *
 * Fails closed. A missing, unreadable or foreign marker refuses — a user who
 * installed the same slug with another tool keeps it. And only the files the
 * marker lists are removed, so anything they added inside our directory
 * survives too.
 */
export async function removeSkillDir(
  io: Io,
  root: string,
  slug: string,
): Promise<DirOutcome> {
  const dir = join(io, root, slug);
  const removed: string[] = [];
  if (!(await io.exists(dir))) {
    return { ok: true, path: dir, files: removed };
  }

  const marker = await readMarker(io, dir);
  if (marker === "none") {
    return { ok: false, path: dir, refusal: "unmarked", files: removed };
  }
  if (marker === "bad") {
    return { ok: false, path: dir, refusal: "unreadable", files: removed };
  }
  if (marker.source !== SOURCE) {
    return { ok: false, path: dir, refusal: "foreign", files: removed };
  }

  for (const rel of marker.files) {
    const path = join(io, dir, ...rel.split("/"));
    try {
      await io.unlink(path);
      removed.push(rel);
    } catch {
      // Already gone by another hand — not an error, just nothing to remove.
    }
  }
  try {
    await io.unlink(join(io, dir, MARKER_NAME));
  } catch {
    // Same.
  }

  // Deepest first, then the skill's own directory. Each throws when something
  // is still inside, which ends the walk on exactly the case we must not
  // touch — a file the user put there. Leaving the shell behind is not
  // harmless: with the marker gone, the next status reads it as another
  // tool's folder and the next install refuses it.
  const subs = [...new Set(marker.files.map(dirOf).filter((d) => d !== ""))];
  for (const sub of subs.sort((a, b) => b.length - a.length)) {
    try {
      await io.rmdir(join(io, dir, ...sub.split("/")));
    } catch {
      // Something else lives there. It stays, and so does the parent.
    }
  }
  try {
    await io.rmdir(dir);
  } catch {
    // Same.
  }
  return { ok: true, path: dir, files: removed };
}
