/**
 * What a test in this package is allowed to touch.
 *
 * The adapter reaches a real port, a real filesystem and real process control.
 * Every one of those has to arrive through an injected dep, and two suites here
 * had already stopped doing that without failing.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const HERE = import.meta.dirname;

const testFiles = (): string[] =>
  readdirSync(HERE).filter((f) => f.endsWith(".test.ts"));

describe("tests stay off the machine they run on", () => {
  it("every real daemon boot is given a temporary home", () => {
    for (const name of testFiles()) {
      const src = readFileSync(join(HERE, name), "utf8");
      if (!src.includes("runDaemon(")) continue;
      expect(src.includes("mkdtemp"), name).toBe(true);
    }
  });

  /**
   * ensureDaemonRunning can end the process holding the port. A harness that
   * does not name killOwner falls through to the real one, and the real one is
   * pointed at whatever is listening on this machine.
   */
  it("any harness that can reach the conflict path injects killOwner", () => {
    for (const name of testFiles()) {
      const src = readFileSync(join(HERE, name), "utf8");
      if (!src.includes("checkAuthority")) continue;
      expect(src.includes("killOwner"), name).toBe(true);
    }
  });
});
