/**
 * The pairing record: the token of the side panel this machine's connector
 * paired with, kept in a file only the local user can read.
 */
import { readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { MIN_TOKEN_LENGTH } from "@modootoday/datalab-extension-app-mcp-core";

import { logDir } from "../log-file.js";
import { writeOwnerOnly } from "../owner-file/index.js";

const FILE_NAME = "pairing.json";

export interface PairingRecord {
  token: string;
  pairedAt: string;
}

export function pairingPath(home: string = homedir()): string {
  return join(logDir(home), FILE_NAME);
}

/** The stored record, or null when there is none or it cannot be used. */
export function readPairingRecord(
  home: string = homedir(),
): PairingRecord | null {
  let raw: string;
  try {
    raw = readFileSync(pairingPath(home), "utf8");
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const { token, pairedAt } = parsed as Record<string, unknown>;
  if (typeof token !== "string" || token.length < MIN_TOKEN_LENGTH) return null;
  if (typeof pairedAt !== "string") return null;
  return { token, pairedAt };
}

/** Persist a record. Returns whether it reached the disk. */
export function writePairingRecord(
  record: PairingRecord,
  home: string = homedir(),
): boolean {
  try {
    writeOwnerOnly(pairingPath(home), `${JSON.stringify(record)}\n`);
    return true;
  } catch {
    return false;
  }
}

/** Remove the record. Returns whether one was there. */
export function deletePairingRecord(home: string = homedir()): boolean {
  const path = pairingPath(home);
  try {
    readFileSync(path);
  } catch {
    return false;
  }
  rmSync(path, { force: true });
  return true;
}
