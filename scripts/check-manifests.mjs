#!/usr/bin/env node
/**
 * Checks that every install manifest in this repository names the same
 * package, server name and version, and that a release tag matches them.
 *   node scripts/check-manifests.mjs [tag]
 */
import { readFileSync } from "node:fs";

const read = (path) => JSON.parse(readFileSync(path, "utf8"));

const mirror = read("mcp/package.json");
const publish = read("publish/package.json");
const server = read("server.json");
const mcpb = read("mcpb/manifest.json");
const npmPackage = server.packages?.find((p) => p.registryType === "npm");

const expectations = [
  ["publish/package.json name", publish.name, mirror.name],
  ["publish/package.json version", publish.version, mirror.version],
  ["publish/package.json mcpName", publish.mcpName, server.name],
  ["server.json version", server.version, mirror.version],
  ["server.json npm identifier", npmPackage?.identifier, mirror.name],
  ["server.json npm version", npmPackage?.version, mirror.version],
  ["mcpb/manifest.json version", mcpb.version, mirror.version],
];
const launch = `${mirror.name}@${mirror.version}`;
const serverName = server.name.split("/").pop();
const versioned = [
  "plugin.json",
  ".claude-plugin/plugin.json",
  ".antigravity-plugin/plugin.json",
  "gemini-extension.json",
];
for (const path of versioned) {
  expectations.push([`${path} version`, read(path).version, mirror.version]);
}
const launching = [
  ["mcp.json", (m) => m.mcpServers],
  [".claude-plugin/plugin.json", (m) => m.mcpServers],
  ["mcp_config.json", (m) => m.mcpServers],
  ["gemini-extension.json", (m) => m.mcpServers],
];
for (const [path, pick] of launching) {
  const args = pick(read(path))?.[serverName]?.args ?? [];
  expectations.push([`${path} launch`, args.at(-1), launch]);
}
// An install manifest launches the connector and nothing more: it grants no
// trust, filters no tools, sets no env and runs no hook on the user's behalf.
const DENIED_KEYS = new Set([
  "trust",
  "includeTools",
  "excludeTools",
  "env",
  "cwd",
  "hooks",
  "commands",
  "agents",
  "alwaysAllow",
  "autoApprove",
]);
function deniedKeys(value, at, found) {
  if (Array.isArray(value)) {
    value.forEach((inner, i) =>
      deniedKeys(inner, `${at}[${String(i)}]`, found),
    );
    return found;
  }
  if (value === null || typeof value !== "object") return found;
  for (const [key, inner] of Object.entries(value)) {
    if (DENIED_KEYS.has(key)) found.push(`${at}.${key}`);
    deniedKeys(inner, `${at}.${key}`, found);
  }
  return found;
}
const manifests = [
  "plugin.json",
  "mcp.json",
  ".claude-plugin/marketplace.json",
  ".claude-plugin/plugin.json",
  ".antigravity-plugin/plugin.json",
  "mcp_config.json",
  "gemini-extension.json",
];
for (const path of manifests) {
  for (const key of deniedKeys(read(path), path, [])) {
    expectations.push([`${key} present`, "present", "absent"]);
  }
}
const tag = process.argv[2];
if (tag !== undefined && tag !== "") {
  expectations.push(["release tag", tag, `v${mirror.version}`]);
}

const failures = expectations.filter(([, actual, wanted]) => actual !== wanted);
for (const [what, actual, wanted] of failures) {
  process.stderr.write(`${what}: ${actual} (expected ${wanted})\n`);
}
if (failures.length > 0) process.exit(1);
process.stdout.write(
  `manifests agree: ${server.name} ${mirror.name}@${mirror.version}\n`,
);
