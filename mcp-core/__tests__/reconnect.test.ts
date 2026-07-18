import { describe, expect, it } from "vitest";

import {
  RECONNECT_BASE_MS,
  RECONNECT_ERROR_CAP_MS,
  RECONNECT_MAX_MS,
  RECONNECT_OFFLINE_CAP_MS,
  backoffCapFor,
  backoffDelay,
  describeStatus,
  isUsable,
  shouldRetry,
  type BridgeStatus,
} from "../src/reconnect.js";

describe("backoffDelay", () => {
  // rng is injected so the bounds are assertable rather than flaky.
  const lo = () => 0;
  const hi = () => 1;

  it("starts near the base delay", () => {
    expect(backoffDelay(0, hi)).toBe(RECONNECT_BASE_MS);
  });

  it("grows exponentially", () => {
    expect(backoffDelay(1, hi)).toBe(RECONNECT_BASE_MS * 2);
    expect(backoffDelay(2, hi)).toBe(RECONNECT_BASE_MS * 4);
  });

  // The cap is a UX decision, not a politeness one: the peer is a local process
  // the user just started, and a minute of silence would read as broken.
  it("never exceeds the cap, however many attempts", () => {
    for (const attempt of [10, 50, 1000]) {
      expect(backoffDelay(attempt, hi)).toBeLessThanOrEqual(RECONNECT_MAX_MS);
    }
  });

  it("stays positive at the jitter floor", () => {
    for (const attempt of [0, 1, 5, 100]) {
      expect(backoffDelay(attempt, lo)).toBeGreaterThan(0);
    }
  });

  it("jitters within the band", () => {
    const at = 3;
    const min = backoffDelay(at, lo);
    const max = backoffDelay(at, hi);
    expect(min).toBeLessThan(max);
    const mid = backoffDelay(at, () => 0.5);
    expect(mid).toBeGreaterThanOrEqual(min);
    expect(mid).toBeLessThanOrEqual(max);
  });

  it("treats negative attempts as the first attempt", () => {
    expect(backoffDelay(-5, hi)).toBe(RECONNECT_BASE_MS);
  });

  it("honors an explicit cap (P2-1 two-tier)", () => {
    // With the tight offline cap, even a high attempt tops out fast so the
    // server appearing goes green in seconds.
    for (const attempt of [10, 50, 1000]) {
      expect(backoffDelay(attempt, hi, RECONNECT_OFFLINE_CAP_MS)).toBe(
        RECONNECT_OFFLINE_CAP_MS,
      );
    }
    // The error cap is longer, so a refusing server is not hammered.
    expect(backoffDelay(1000, hi, RECONNECT_ERROR_CAP_MS)).toBe(
      RECONNECT_ERROR_CAP_MS,
    );
  });
});

describe("backoffCapFor", () => {
  it("uses the tight cap while the peer is merely absent", () => {
    expect(backoffCapFor({ kind: "idle" })).toBe(RECONNECT_OFFLINE_CAP_MS);
    expect(backoffCapFor({ kind: "connecting", attempt: 2 })).toBe(
      RECONNECT_OFFLINE_CAP_MS,
    );
    expect(
      backoffCapFor({ kind: "offline", attempt: 9, nextRetryInMs: 0 }),
    ).toBe(RECONNECT_OFFLINE_CAP_MS);
  });

  it("uses the long cap once the peer is present but refusing us", () => {
    expect(
      backoffCapFor({
        kind: "error",
        reason: "unauthorized",
        message: "",
        nextRetryInMs: 0,
      }),
    ).toBe(RECONNECT_ERROR_CAP_MS);
  });

  it("keeps the offline cap strictly tighter than the error cap", () => {
    expect(RECONNECT_OFFLINE_CAP_MS).toBeLessThan(RECONNECT_ERROR_CAP_MS);
  });
});

describe("shouldRetry", () => {
  // "Server not running" is the normal state, not a fault — the panel keeps
  // looking so the user just sees it go green.
  it("keeps retrying while offline", () => {
    expect(
      shouldRetry({ kind: "offline", attempt: 3, nextRetryInMs: 1000 }),
    ).toBe(true);
  });

  it("keeps retrying a bad token — the user can re-pair without touching us", () => {
    expect(
      shouldRetry({
        kind: "error",
        reason: "unauthorized",
        message: "",
        nextRetryInMs: 1000,
      }),
    ).toBe(true);
  });

  // Retrying cannot fix a version mismatch; hammering a server that will refuse
  // us until a human updates something is pure noise.
  it("stops on a version mismatch", () => {
    expect(
      shouldRetry({
        kind: "error",
        reason: "version_mismatch",
        message: "",
        nextRetryInMs: 1000,
      }),
    ).toBe(false);
  });

  it("keeps retrying from idle and connecting", () => {
    expect(shouldRetry({ kind: "idle" })).toBe(true);
    expect(shouldRetry({ kind: "connecting", attempt: 0 })).toBe(true);
  });
});

describe("isUsable", () => {
  it("is true only when connected", () => {
    expect(
      isUsable({
        kind: "connected",
        protocolVersion: 1,
        serverVersion: "1",
        toolCount: 3,
      }),
    ).toBe(true);
    expect(isUsable({ kind: "idle" })).toBe(false);
    expect(isUsable({ kind: "offline", attempt: 1, nextRetryInMs: 1 })).toBe(
      false,
    );
    expect(isUsable({ kind: "connecting", attempt: 1 })).toBe(false);
    expect(
      isUsable({ kind: "error", reason: "x", message: "y", nextRetryInMs: 1 }),
    ).toBe(false);
  });
});

describe("describeStatus", () => {
  const cases: BridgeStatus[] = [
    { kind: "idle" },
    { kind: "connecting", attempt: 1 },
    { kind: "offline", attempt: 1, nextRetryInMs: 1000 },
    {
      kind: "connected",
      protocolVersion: 1,
      serverVersion: "0.0.1",
      toolCount: 119,
    },
    {
      kind: "error",
      reason: "unauthorized",
      message: "토큰이 올바르지 않습니다",
      nextRetryInMs: 1,
    },
  ];

  it.each(cases)("returns a non-empty string for $kind", (status) => {
    expect(describeStatus(status)).toBeTruthy();
  });

  it("surfaces the tool count when connected", () => {
    expect(
      describeStatus({
        kind: "connected",
        protocolVersion: 1,
        serverVersion: "0.0.1",
        toolCount: 119,
      }),
    ).toContain("119");
  });

  // An error already carries an actionable sentence; re-wording it here would
  // drop the detail that names the fix.
  it("passes an error's own message through", () => {
    const message = "확장이 오래됐습니다 — 업데이트하세요";
    expect(
      describeStatus({
        kind: "error",
        reason: "version_mismatch",
        message,
        nextRetryInMs: 1,
      }),
    ).toBe(message);
  });
});
