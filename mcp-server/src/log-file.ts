/**
 * Where the detached connector writes what it is doing, since it is tied to no
 * terminal and would otherwise have nowhere to speak.
 *
 * 🔴 Two properties keep the file from becoming its own problem: it rolls at a
 * size cap so at most two exist, and every failure here degrades to silence
 * rather than blocking the connector. Only operational lines land in it —
 * lifecycle, refusals, faults — never tool arguments or document contents.
 */
import {
  appendFileSync,
  mkdirSync,
  openSync,
  renameSync,
  statSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Roll at this size — large enough to hold a session, small enough to read. */
export const LOG_MAX_BYTES = 1024 * 1024;

const DIR_NAME = ".datalab-mcp";
const FILE_NAME = "connector.log";

/** The directory holding the connector's log. */
export function logDir(home: string = homedir()): string {
  return join(home, DIR_NAME);
}

/** The file the connector's diagnostics are appended to. */
export function logPath(home: string = homedir()): string {
  return join(logDir(home), FILE_NAME);
}

/** The previous file, kept until the next roll replaces it. */
export function rolledLogPath(home: string = homedir()): string {
  return `${logPath(home)}.1`;
}

/**
 * Roll the log aside if it has reached the cap. A missing file is neither a
 * roll nor an error — the first run has nothing to move.
 */
export function rollIfLarge(
  home: string = homedir(),
  maxBytes: number = LOG_MAX_BYTES,
): boolean {
  try {
    const size = statSync(logPath(home)).size;
    if (size < maxBytes) return false;
    renameSync(logPath(home), rolledLogPath(home));
    return true;
  } catch {
    return false;
  }
}

/**
 * Open the log for appending, rolling first if needed. Returns a descriptor the
 * caller may hand to a child process, or null when the location is unwritable.
 */
export function openLogFd(home: string = homedir()): number | null {
  try {
    mkdirSync(logDir(home), { recursive: true });
    rollIfLarge(home);
    return openSync(logPath(home), "a");
  } catch {
    return null;
  }
}

/** Append one line, timestamped. Silent when the location is unwritable. */
export function appendLogLine(message: string, home: string = homedir()): void {
  try {
    mkdirSync(logDir(home), { recursive: true });
    rollIfLarge(home);
    appendFileSync(logPath(home), `${new Date().toISOString()} ${message}\n`);
  } catch {
    // Diagnostics are never worth failing a request over.
  }
}
