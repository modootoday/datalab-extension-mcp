/**
 * The approved AI apps, kept beside the pairing record in a file only the
 * local user can read.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import {
  normalizeAppName,
  type ApprovedApp,
} from "@modootoday/datalab-extension-app-mcp-core";

import { logDir } from "../log-file.js";
import { writeOwnerOnly } from "../owner-file/index.js";

const FILE_NAME = "apps.json";

export function appsPath(home: string = homedir()): string {
  return join(logDir(home), FILE_NAME);
}

/** The stored apps; an unreadable or malformed file is an empty list. */
export function readApprovedApps(home: string = homedir()): ApprovedApp[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(appsPath(home), "utf8"));
  } catch {
    return [];
  }
  if (typeof parsed !== "object" || parsed === null) return [];
  const list = (parsed as { apps?: unknown }).apps;
  if (!Array.isArray(list)) return [];
  const out: ApprovedApp[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const { name, approvedAt } = item as Record<string, unknown>;
    const clean = normalizeAppName(name);
    if (clean === null || typeof approvedAt !== "string") continue;
    out.push({ name: clean, approvedAt });
  }
  return out;
}

/** Persist the list. Returns whether it reached the disk. */
export function writeApprovedApps(
  apps: readonly ApprovedApp[],
  home: string = homedir(),
): boolean {
  try {
    writeOwnerOnly(appsPath(home), `${JSON.stringify({ apps })}\n`);
    return true;
  } catch {
    return false;
  }
}
