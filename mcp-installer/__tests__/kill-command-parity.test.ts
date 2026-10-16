/**
 * The listener lookup exists twice on purpose and must stay identical.
 *
 * The installer carries zero runtime dependencies — that is its contract, and
 * it has to run before an install exists — so it cannot import the connector's
 * copy. Two copies of code that decides which process to end is exactly the
 * shape that drifts on one platform and is noticed by nobody.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MINE = readFileSync(
  join(import.meta.dirname, "..", "src", "port-listener.ts"),
  "utf8",
);

/**
 * The connector's copy, read as text: importing it is what the zero-dep rule
 * forbids. Both layouts are named because the published mirror lays the
 * packages out as siblings of a different root.
 */
function connectorSource(): string {
  const candidates = [
    join(
      import.meta.dirname,
      "..",
      "..",
      "extension-mcp-server",
      "src",
      "port-owner.ts",
    ),
    join(import.meta.dirname, "..", "..", "mcp-server", "src", "port-owner.ts"),
  ];
  for (const path of candidates) {
    try {
      return readFileSync(path, "utf8");
    } catch {
      continue;
    }
  }
  throw new Error(`port-owner.ts not found in: ${candidates.join(", ")}`);
}

/** The text of one exported function, from its signature to its closing brace. */
function fn(src: string, name: string): string {
  const start = src.indexOf(`export function ${name}(`);
  if (start < 0) throw new Error(`${name} not found`);
  const end = src.indexOf("\n}\n", start);
  return src.slice(start, end + 2);
}

describe("the two listener lookups agree", () => {
  const theirs = connectorSource();
  for (const name of [
    "parseNetstatListeners",
    "parseLsofPids",
    "listenerQuery",
  ]) {
    it(`${name} is the same text in both`, () => {
      expect(fn(MINE, name)).toBe(fn(theirs, name));
    });
  }

  it("neither copy starts a shell or a script host", () => {
    for (const src of [MINE, theirs]) {
      expect(src).not.toMatch(/powershell|pwsh|"cmd"|"sh"|shell:\s*true/i);
    }
  });
});
