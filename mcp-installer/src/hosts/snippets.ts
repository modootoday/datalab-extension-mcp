/**
 * Snippet rendering and presence probing shared by the Tier-3 vendors.
 */
import type { Io } from "../types.js";
import {
  buildEnv,
  buildFileEntry,
  packageSpec,
  SERVER_NAME,
  type ServerEntryOptions,
} from "./entries.js";

export function jsonSnippet(
  topKey: string,
  opts: ServerEntryOptions,
  platform: string,
): string {
  const entry = buildFileEntry(opts, platform);
  return JSON.stringify({ [topKey]: { [SERVER_NAME]: entry } }, null, 2);
}

/**
 * Emits the TOML block without a TOML library.  Safe only because we write a
 * fixed set of keys and every interpolated value has passed the strict
 * validation patterns, so no escaping case can arise.
 */
export function tomlSnippet(opts: ServerEntryOptions): string {
  const lines = [
    `[mcp_servers.${SERVER_NAME}]`,
    `command = "npx"`,
    `args = ["-y", "${packageSpec(opts.version)}"]`,
    "",
    `[mcp_servers.${SERVER_NAME}.env]`,
  ];
  for (const [key, value] of Object.entries(buildEnv(opts))) {
    lines.push(`${key} = "${value}"`);
  }
  return lines.join("\n");
}

export async function fileOrParentExists(
  io: Io,
  path: string | null,
): Promise<boolean> {
  // An unresolvable path counts as absent. Guarding for null at each call site
  // instead would eventually miss one.
  if (path === null) {
    return false;
  }
  if (await io.exists(path)) {
    return true;
  }
  const cut = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  if (cut <= 0) {
    return false;
  }
  return io.exists(path.slice(0, cut));
}
