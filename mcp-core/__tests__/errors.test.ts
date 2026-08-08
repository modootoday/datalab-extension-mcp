import { describe, expect, it } from "vitest";

import {
  BRIDGE_LIMITS,
  isKnownReason,
  MCP_TOOL_REASONS,
  MCP_TRANSPORT_REASONS,
  policyFor,
  REASON_POLICY,
  type McpReason,
} from "../src/errors.js";

const ALL: readonly McpReason[] = [
  ...MCP_TOOL_REASONS,
  ...MCP_TRANSPORT_REASONS,
];

describe("REASON_POLICY", () => {
  it("has a policy for every enumerated reason, and no ghosts", () => {
    expect(Object.keys(REASON_POLICY).sort()).toEqual([...ALL].sort());
  });

  // 🔴 Retry-later without a later is a hot loop, so the one reason that can
  // name its wait must name it.
  it("gives rate_limited a wait derived from the refill rate", () => {
    expect(REASON_POLICY.rate_limited.retryable).toBe(true);
    expect(REASON_POLICY.rate_limited.retryAfterMs).toBe(
      1000 / BRIDGE_LIMITS.refillPerSecond,
    );
  });

  it("never attaches a wait to something that is not retryable", () => {
    for (const r of ALL) {
      const p = REASON_POLICY[r];
      if (!p.retryable) expect(p.retryAfterMs).toBeUndefined();
    }
  });

  // 🔴 Retrying is only for what resolves on its own. Re-asking something the
  // user already answered is nagging them with the same dialog until they give
  // in, so these four stay false whatever else changes.
  it("refuses to retry anything that needs a person to act", () => {
    for (const r of [
      "needs_consent",
      "not_confirmed",
      "confirm_timeout",
      "confirm_too_late",
    ] as const) {
      expect(REASON_POLICY[r].retryable).toBe(false);
    }
  });

  it("refuses to retry a request that is simply wrong", () => {
    for (const r of ["unknown_tool", "invalid_args", "tool_closed"] as const) {
      expect(REASON_POLICY[r].retryable).toBe(false);
    }
  });

  it("allows retry where waiting genuinely helps", () => {
    for (const r of ["timeout", "connection_lost", "tool_error"] as const) {
      expect(REASON_POLICY[r].retryable).toBe(true);
    }
  });
});

describe("policyFor", () => {
  // 🔴 Default-deny: guessing retry on an unrecognised reason turns an unknown
  // failure into one repeated forever.
  it("treats an unknown reason as not retryable", () => {
    expect(policyFor("something_new")).toEqual({ retryable: false });
  });

  it("returns the table entry for a known reason", () => {
    expect(policyFor("rate_limited")).toBe(REASON_POLICY.rate_limited);
  });
});

describe("isKnownReason", () => {
  it("recognises every enumerated reason", () => {
    for (const r of ALL) expect(isKnownReason(r)).toBe(true);
  });

  it("rejects a string that is not one", () => {
    expect(isKnownReason("nope")).toBe(false);
  });
});

describe("BRIDGE_LIMITS", () => {
  // 🔴 These numbers are a published promise: change one and every place that
  // quotes it changes in the same commit.
  it("states the burst and refill the bridge actually enforces", () => {
    expect(BRIDGE_LIMITS.capacity).toBe(10);
    expect(BRIDGE_LIMITS.refillPerSecond).toBe(1);
  });

  it("is frozen so a caller cannot widen the promise at runtime", () => {
    expect(Object.isFrozen(BRIDGE_LIMITS)).toBe(true);
  });
});
