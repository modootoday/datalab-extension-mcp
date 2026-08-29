/**
 * The disagreement this replaces: one implementation answered "not older" for
 * garbage, the other answered "equal" — and the second sat under a version
 * floor, where equal is accepted.
 */
import { describe, expect, it } from "vitest";

import { compareSemver, isOlderVersion, isSemver } from "./version.js";

describe("compareSemver", () => {
  it("orders plain versions", () => {
    expect(compareSemver("1.8.2", "1.8.10")).toBe(-1);
    expect(compareSemver("2.0.0", "1.9.9")).toBe(1);
    expect(compareSemver("1.8.2", "1.8.2")).toBe(0);
  });

  // The whole reason this module exists: unanswerable must not read as equal,
  // because a floor check treats equal as good enough.
  it("says it cannot tell rather than guessing", () => {
    expect(compareSemver("latest", "1.0.0")).toBeNull();
    expect(compareSemver("1.0", "1.0.0")).toBeNull();
    expect(compareSemver(undefined, "1.0.0")).toBeNull();
    expect(compareSemver("1.0.0", "1.0.0-rc.1")).toBeNull();
  });

  it("isOlderVersion is false whenever the comparison cannot be made", () => {
    expect(isOlderVersion("1.0.0", "1.0.1")).toBe(true);
    expect(isOlderVersion("latest", "1.0.1")).toBe(false);
    expect(isOlderVersion("1.0.1", "1.0.0")).toBe(false);
  });

  it("isSemver rejects everything the regex does", () => {
    expect(isSemver("1.2.3")).toBe(true);
    expect(isSemver("v1.2.3")).toBe(false);
    expect(isSemver(12)).toBe(false);
  });
});
