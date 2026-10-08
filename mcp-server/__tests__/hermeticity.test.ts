/**
 * What a test in this package is allowed to touch.
 *
 * Both escapes happened here this week: a suite that read the operator's real
 * home, and one that spawned a kill against the port their own connector was
 * listening on. Neither failed — they quietly used the machine they ran on.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const HERE = import.meta.dirname;
const SRC = join(HERE, "..", "src");

const testFiles = (): string[] =>
  readdirSync(HERE).filter((f) => f.endsWith(".test.ts"));

describe("tests stay off the machine they run on", () => {
  /**
   * The daemon writes its ledger, media stage and takeover file under `home`.
   * A boot without one writes into the operator's, and what it finds there
   * depends on whose machine it is.
   */
  it("every real daemon boot is given a temporary home", () => {
    for (const name of testFiles()) {
      const src = readFileSync(join(HERE, name), "utf8");
      if (!src.includes("runDaemon(")) continue;
      expect(src.includes("mkdtemp"), name).toBe(true);
    }
  });

  /**
   * killPortOwner ends whatever holds the port. Callers inject their own in
   * tests; this is the backstop for the ones that forget, and losing it turns
   * a forgotten injection into a developer's connector being killed.
   */
  it("the port kill refuses to run under a test runner", () => {
    const src = readFileSync(join(SRC, "port-owner.ts"), "utf8");
    expect(src).toContain('process.env["VITEST"]');
  });
});
