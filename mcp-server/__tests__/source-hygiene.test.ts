/**
 * 🔴 A literal control character in a source file turns it binary: grep skips
 * it, diffs stop being readable, and the publish gate that scans this tree for
 * leaked internals cannot read it either — so the file quietly stops being
 * checked. Escapes carry the same value and none of that.
 *
 * This tree is published, which is why the guard lives here.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = new URL("../src/", import.meta.url).pathname;

async function sources(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await sources(full)));
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

describe("공개되는 소스의 위생", () => {
  it("🔴 리터럴 제어문자가 없다 — 있으면 파일이 binary 가 된다", async () => {
    const offenders: string[] = [];
    for (const file of await sources(SRC)) {
      const bytes = await readFile(file);
      // Tab, LF and CR are the only control bytes text legitimately holds.
      const bad = bytes.some(
        (b) => b < 9 || (b > 13 && b < 32) || b === 11 || b === 12,
      );
      if (bad) offenders.push(file.slice(SRC.length));
    }
    expect(offenders).toEqual([]);
  });
});
