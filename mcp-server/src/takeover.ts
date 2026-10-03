/**
 * The proof that lets a local adapter retire a running daemon.
 *
 * `/mcp/shutdown` is gated on the daemon's root token so a browser reaching
 * loopback cannot end a run it does not own. That gate also locks out the one
 * caller who should always win: an adapter this machine just spawned from an
 * MCP host config. When those two tokens differ the port stays held by a daemon
 * nobody can register with, stop, or outlive — it idles out only at zero
 * connections, which a running host prevents.
 *
 * So the daemon writes a secret only a local user can read. Presenting it
 * proves filesystem access, which is strictly more authority than killing the
 * process by pid — something the same caller could already do. A page or
 * extension speaking HTTP to 127.0.0.1 cannot read it, so the property the
 * token gate exists for is unchanged.
 */
import { randomBytes } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { logDir } from "./log-file.js";

const FILE_NAME = "takeover";
/** Owner read/write. Best-effort: Windows ignores the bits. */
const OWNER_ONLY = 0o600;

export function takeoverPath(home: string = homedir()): string {
  return join(logDir(home), FILE_NAME);
}

/**
 * Mint and persist this daemon's takeover secret. Called once the bind is won,
 * so a process that lost the race never overwrites the winner's file.
 *
 * Returns null when the state directory cannot be written; the daemon still
 * serves, and a later conflict falls back to the operator-facing message.
 */
export function writeTakeoverSecret(home: string = homedir()): string | null {
  try {
    mkdirSync(logDir(home), { recursive: true });
    const secret = randomBytes(32).toString("hex");
    const path = takeoverPath(home);
    writeFileSync(path, `${secret}\n`, { encoding: "utf8", mode: OWNER_ONLY });
    try {
      chmodSync(path, OWNER_ONLY);
    } catch {
      // Already created with the mode; a filesystem that refuses chmod is not
      // a reason to refuse to run.
    }
    return secret;
  } catch {
    return null;
  }
}

/** The running daemon's secret, or null when there is nothing readable. */
export function readTakeoverSecret(home: string = homedir()): string | null {
  try {
    const raw = readFileSync(takeoverPath(home), "utf8").trim();
    return raw === "" ? null : raw;
  } catch {
    return null;
  }
}
