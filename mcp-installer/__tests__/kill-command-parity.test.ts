/**
 * The kill command exists twice on purpose and must stay identical.
 *
 * The installer carries zero runtime dependencies — that is its contract, and
 * it has to run before an install exists — so it cannot import the connector's
 * copy. Two copies of a command that ends a process is exactly the shape that
 * drifts on one platform and is noticed by nobody.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { killCommand } from "../src/reclaim.js";

/**
 * The connector's copy, read as text: importing it is what the zero-dep rule
 * forbids. Both layouts are named because the published mirror lays the
 * packages out as siblings of a different root.
 */
function connectorSource(): string {
  const candidates = [
    join(import.meta.dirname, "..", "..", "mcp-server", "src", "port-owner.ts"),
    join(import.meta.dirname, "..", "mcp-server", "src", "port-owner.ts"),
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

describe("the two kill commands agree", () => {
  it("issues the same command on every platform we ship", () => {
    const src = connectorSource();
    for (const platform of ["win32", "darwin", "linux"]) {
      const mine = killCommand(platform, 8765);
      expect(mine, platform).not.toBeNull();
      // The connector's copy is compared as text because it cannot be called
      // from here; the command body is what must match.
      for (const arg of mine?.args ?? []) {
        if (arg.length < 30) continue;
        const shape = arg.replace(/8765/g, "${p}");
        expect(src.includes(shape), `${platform}: ${shape}`).toBe(true);
      }
    }
  });

  it("both refuse a platform they have no command for", () => {
    expect(killCommand("aix", 8765)).toBeNull();
    expect(connectorSource()).toContain("return null;");
  });
});
