import { describe, expect, it } from "vitest";

import {
  LOOPBACK_HOSTS,
  MIN_TOKEN_LENGTH,
  checkExtensionIdentity,
  checkOrigin,
  checkToken,
  isLoopbackHost,
  timingSafeEqual,
} from "../src/auth.js";

const EXT_ID = "abcdefghijklmnopabcdefghijklmnop";
const GOOD_TOKEN = "t".repeat(MIN_TOKEN_LENGTH);

describe("isLoopbackHost", () => {
  it.each(LOOPBACK_HOSTS)("accepts %s", (host) => {
    expect(isLoopbackHost(host)).toBe(true);
  });

  it("is case- and whitespace-insensitive", () => {
    expect(isLoopbackHost("  LOCALHOST ")).toBe(true);
  });

  // A wildcard bind would put the user's browser within reach of the LAN.
  it("rejects 0.0.0.0", () => {
    expect(isLoopbackHost("0.0.0.0")).toBe(false);
  });

  it.each([
    "192.168.1.10",
    "10.0.0.1",
    "example.com",
    "127.0.0.1.evil.com",
    "",
  ])("rejects %s", (host) => {
    expect(isLoopbackHost(host)).toBe(false);
  });
});

describe("timingSafeEqual", () => {
  it("is true only for identical strings", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
  });

  it("is false when lengths differ", () => {
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
    expect(timingSafeEqual("", "a")).toBe(false);
  });

  it("treats empty vs empty as equal", () => {
    expect(timingSafeEqual("", "")).toBe(true);
  });

  // Wall-clock timing cannot be asserted without flaking, so the contract
  // that makes constant time possible is asserted instead: equal-length inputs
  // never short-circuit.
  it("compares same-length strings that differ only at the end", () => {
    const a = "x".repeat(64) + "a";
    const b = "x".repeat(64) + "b";
    expect(timingSafeEqual(a, b)).toBe(false);
  });
});

describe("checkToken", () => {
  it("accepts the expected token", () => {
    expect(checkToken(GOOD_TOKEN, GOOD_TOKEN)).toEqual({ ok: true });
  });

  it("rejects a wrong token", () => {
    const out = checkToken("x".repeat(MIN_TOKEN_LENGTH), GOOD_TOKEN);
    expect(out).toMatchObject({ ok: false, reason: "unauthorized" });
  });

  // Absent, empty, and wrong must be indistinguishable to a prober.
  it.each([undefined, null, ""])(
    "rejects %p indistinguishably",
    (presented) => {
      const absent = checkToken(presented, GOOD_TOKEN);
      const wrong = checkToken("x".repeat(MIN_TOKEN_LENGTH), GOOD_TOKEN);
      expect(absent).toEqual(wrong);
    },
  );

  // A short expected token means misconfiguration; failing closed beats
  // accepting a guessable secret.
  it("refuses to authorise against an under-length expected token", () => {
    const weak = "s".repeat(MIN_TOKEN_LENGTH - 1);
    expect(checkToken(weak, weak)).toMatchObject({
      ok: false,
      reason: "unauthorized",
    });
  });
});

const PAIRED = [EXT_ID];
const OTHER_ID = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

describe("checkOrigin", () => {
  it("accepts our extension", () => {
    expect(checkOrigin(`chrome-extension://${EXT_ID}`, PAIRED)).toEqual({
      ok: true,
    });
  });

  it("rejects another extension", () => {
    expect(
      checkOrigin("chrome-extension://someotherextensionidhere00", PAIRED),
    ).toMatchObject({
      ok: false,
      reason: "forbidden_origin",
    });
  });

  // A web page on loopback: the browser stamps its real origin and the page
  // cannot lie about it.
  it("rejects a web page origin", () => {
    expect(checkOrigin("https://evil.example", PAIRED)).toMatchObject({
      ok: false,
      reason: "forbidden_origin",
    });
  });

  it.each([undefined, null, "", "null"])("rejects %p", (origin) => {
    expect(checkOrigin(origin, PAIRED)).toMatchObject({
      ok: false,
      reason: "forbidden_origin",
    });
  });

  // An origin that merely contains our id is not our id.
  it("rejects an origin that only contains the extension id", () => {
    expect(
      checkOrigin(`https://evil.example/chrome-extension://${EXT_ID}`, PAIRED),
    ).toMatchObject({
      ok: false,
    });
  });

  // Paired with nobody must match nobody. A list is the shape now, and an
  // empty one is the state a misconfigured server is in — it has to refuse.
  it("rejects everything when the paired list is empty", () => {
    expect(checkOrigin(`chrome-extension://${EXT_ID}`, [])).toMatchObject({
      ok: false,
      reason: "forbidden_origin",
    });
  });

  it("accepts any one of several paired ids", () => {
    expect(
      checkOrigin(`chrome-extension://${OTHER_ID}`, [EXT_ID, OTHER_ID]),
    ).toEqual({ ok: true });
  });

  // Widening to a list must not widen to a pattern: still whole-string
  // equality against each, so a longer origin built around a paired id fails.
  it("still rejects an origin that merely contains a paired id", () => {
    expect(
      checkOrigin(`chrome-extension://${EXT_ID}.evil`, [EXT_ID, OTHER_ID]),
    ).toMatchObject({ ok: false });
  });
});

describe("checkExtensionIdentity", () => {
  // A present Origin is authoritative, whatever the body id says.
  it("accepts a present, matching Origin", () => {
    expect(
      checkExtensionIdentity(`chrome-extension://${EXT_ID}`, undefined, PAIRED),
    ).toEqual({ ok: true });
  });

  it("rejects a present, wrong Origin even if the body id is right", () => {
    // A web page cannot omit its Origin, so it never reaches the body-id
    // branch.
    expect(
      checkExtensionIdentity("https://evil.example", EXT_ID, PAIRED),
    ).toMatchObject({ ok: false, reason: "forbidden_origin" });
  });

  // The path that must succeed on a real device: the service worker's fetch
  // sends no Origin, so identity comes from the body-carried id.
  it.each([undefined, null, ""])(
    "accepts a matching body id when Origin is %p",
    (origin) => {
      expect(checkExtensionIdentity(origin, EXT_ID, PAIRED)).toEqual({
        ok: true,
      });
    },
  );

  it("rejects a wrong body id when Origin is absent", () => {
    expect(
      checkExtensionIdentity(
        undefined,
        "someotherextensionidhere000000",
        PAIRED,
      ),
    ).toMatchObject({ ok: false, reason: "forbidden_origin" });
  });

  it("rejects when both Origin and body id are absent", () => {
    expect(checkExtensionIdentity(undefined, undefined, PAIRED)).toMatchObject({
      ok: false,
      reason: "forbidden_origin",
    });
  });

  it("accepts a body id that is any one of several paired ids", () => {
    expect(
      checkExtensionIdentity(undefined, OTHER_ID, [EXT_ID, OTHER_ID]),
    ).toEqual({ ok: true });
  });

  // The same fail-closed answer on the body path. Nothing is paired, so
  // nothing is our extension.
  it("rejects a body id when the paired list is empty", () => {
    expect(checkExtensionIdentity(undefined, EXT_ID, [])).toMatchObject({
      ok: false,
      reason: "forbidden_origin",
    });
  });
});
