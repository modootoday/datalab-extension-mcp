/**
 * Direct TOML config writes, under the same hygiene floor as write-json.
 *
 * The difference is the merge. A TOML config is hand-edited and full of
 * comments, so parse-and-reserialise would hand the file back reformatted with
 * the comments gone. This edits text: it replaces the span our own table
 * occupies and leaves every other byte alone, refusing outright on any shape
 * it cannot locate unambiguously.
 */
import type { Io } from "./types.js";
import {
  atomicWrite,
  restoreNewestBackup,
  writeBackup,
  type WriteOutcome,
} from "./write-json.js";

/** `ambiguous` = the file mentions our server in a form this cannot edit. */
export type TomlRefusal = "ambiguous" | "verify";

interface Span {
  /** Line index of our table header, or -1 when absent. */
  start: number;
  /** Line index just past the last line we own. */
  end: number;
}

const isTableHeader = (line: string): boolean => /^\s*\[/.test(line);

/** "base" = our table itself, "sub" = one of its subtables such as .env. */
function headerKind(line: string, server: string): "base" | "sub" | null {
  const m =
    /^\s*\[\s*mcp_servers\s*\.\s*([A-Za-z0-9_-]+)\s*(\.[^\]]*)?\]\s*$/.exec(
      line,
    );
  if (m === null || m[1] !== server) return null;
  return m[2] === undefined ? "base" : "sub";
}

const ownsHeader = (line: string, server: string): boolean =>
  headerKind(line, server) !== null;

/**
 * Forms this deliberately refuses rather than guesses at.
 *
 * A dotted or inline assignment puts our server somewhere other than its own
 * table, and editing around it would either duplicate the key or drop the
 * user's version of it. Refusing hands the snippet back instead, which is
 * still a working answer.
 */
function isAmbiguous(lines: readonly string[], server: string): boolean {
  let headers = 0;
  let inServersTable = false;
  for (const line of lines) {
    if (headerKind(line, server) === "base") {
      headers += 1;
    }
    if (isTableHeader(line)) {
      inServersTable = /^\s*\[\s*mcp_servers\s*\]\s*$/.test(line);
      continue;
    }
    // `mcp_servers.datalab = { ... }` at any level.
    if (new RegExp(`^\\s*mcp_servers\\s*\\.\\s*${server}\\s*=`).test(line)) {
      return true;
    }
    // `datalab = { ... }` inside [mcp_servers].
    if (inServersTable && new RegExp(`^\\s*${server}\\s*=`).test(line)) {
      return true;
    }
  }
  return headers > 1;
}

/** The lines our table owns: its header through the next foreign header. */
function findSpan(lines: readonly string[], server: string): Span {
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (start === -1) {
      if (ownsHeader(line, server)) start = i;
      continue;
    }
    if (isTableHeader(line) && !ownsHeader(line, server)) {
      return { start, end: i };
    }
  }
  return { start, end: start === -1 ? -1 : lines.length };
}

/** Trailing blank lines belong to the gap between tables, not to our table. */
function trimTrailingBlanks(lines: string[], end: number): number {
  let e = end;
  while (e > 0 && (lines[e - 1] ?? "").trim() === "") e -= 1;
  return e;
}

function splice(raw: string, snippet: string, server: string): string | null {
  const lines = raw.split("\n");
  if (isAmbiguous(lines, server)) return null;

  const span = findSpan(lines, server);
  if (span.start === -1) {
    const body = raw.trimEnd();
    return body === "" ? `${snippet}\n` : `${body}\n\n${snippet}\n`;
  }
  const end = trimTrailingBlanks(lines, span.end);
  const before = lines.slice(0, span.start);
  const after = lines.slice(end);
  return [...before, ...snippet.split("\n"), ...after].join("\n");
}

function cut(raw: string, server: string): { text: string; found: boolean } {
  const lines = raw.split("\n");
  if (isAmbiguous(lines, server)) return { text: raw, found: false };
  const span = findSpan(lines, server);
  if (span.start === -1) return { text: raw, found: false };
  const end = trimTrailingBlanks(lines, span.end);
  const kept = [...lines.slice(0, span.start), ...lines.slice(end)];
  return { text: `${kept.join("\n").trimEnd()}\n`, found: true };
}

/**
 * Install: put our table in the file, creating the file when absent.
 *
 * Read immediately before the write -- the desktop app rewrites this file
 * while running -- then back up, write via a sibling temp file, and re-read to
 * confirm. A verify failure restores the backup rather than leaving a file
 * nobody chose.
 */
export async function upsertTomlServer(
  io: Io,
  filePath: string,
  snippet: string,
  server: string,
): Promise<WriteOutcome> {
  const exists = await io.exists(filePath);
  const raw = exists ? await io.readFile(filePath) : "";
  const next = splice(raw, snippet, server);
  if (next === null) {
    return { ok: false, changed: false, reason: "parse" };
  }
  if (exists && next === raw) {
    return { ok: true, changed: false };
  }

  const backupPath = exists ? await writeBackup(io, filePath, raw) : undefined;
  await atomicWrite(io, filePath, next);

  const verify = await io.readFile(filePath);
  if (verify !== next) {
    if (exists) await restoreNewestBackup(io, filePath);
    return { ok: false, changed: false, reason: "verify" };
  }
  return backupPath === undefined
    ? { ok: true, changed: true }
    : { ok: true, changed: true, backupPath };
}

/** Uninstall: remove our table and nothing else. Absent is success, not error. */
export async function removeTomlServer(
  io: Io,
  filePath: string,
  server: string,
): Promise<WriteOutcome> {
  if (!(await io.exists(filePath))) {
    return { ok: true, changed: false, reason: "missing" };
  }
  const raw = await io.readFile(filePath);
  const { text, found } = cut(raw, server);
  if (!found) {
    return { ok: true, changed: false };
  }

  const backupPath = await writeBackup(io, filePath, raw);
  await atomicWrite(io, filePath, text);

  const verify = await io.readFile(filePath);
  if (verify !== text) {
    await restoreNewestBackup(io, filePath);
    return { ok: false, changed: false, reason: "verify" };
  }
  return { ok: true, changed: true, backupPath };
}
