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
