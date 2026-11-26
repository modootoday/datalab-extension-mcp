/**
 * Recognises an entry this connector wrote, whatever key it sits under.
 *
 * A config key is a name anyone can pick, so a key alone never proves an
 * entry is ours: the launch line or our own environment variable has to.
 */
import { SERVER_PACKAGE } from "./entries.js";

/** The package's base name, present in both the npx spec and the global path. */
const PACKAGE_MARK = SERVER_PACKAGE.slice(SERVER_PACKAGE.indexOf("/") + 1);
const TOKEN_KEY = "DATALAB_MCP_TOKEN";
const DAEMON_URL = /^http:\/\/127\.0\.0\.1:\d{1,5}\/mcp$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** True for a JSON config entry that launches our package or points at our daemon. */
export function isOurEntry(entry: unknown): boolean {
  if (!isRecord(entry)) return false;
  if (typeof entry["url"] === "string" && DAEMON_URL.test(entry["url"])) {
    return true;
  }
  const args = Array.isArray(entry["args"]) ? entry["args"] : [];
  const argv = [entry["command"], ...args];
  if (argv.some((p) => typeof p === "string" && p.includes(PACKAGE_MARK))) {
    return true;
  }
  const env = entry["env"];
  return isRecord(env) && TOKEN_KEY in env;
}

/** The same proof for the text of one TOML table and its subtables. */
export function isOurTomlTable(text: string): boolean {
  return text.includes(PACKAGE_MARK) || text.includes(TOKEN_KEY);
}
