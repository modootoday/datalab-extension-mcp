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

  // The Browser MCP bug in one assertion: binding 0.0.0.0 puts the user's
  // browser under the control of anyone on their LAN.
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

  // Differing only in the last character must still compare every character —
  // an early return on the first mismatch is the timing leak this exists to
  // avoid. We cannot assert on wall-clock here without flaking, so we assert
  // the contract that makes constant time possible: same-length inputs never
  // short-circuit to a length check.
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

  // Absent, empty, and wrong must be indistinguishable to a prober: the reason
  // and message are identical across all three.
  it.each([undefined, null, ""])(
    "rejects %p indistinguishably",
    (presented) => {
      const absent = checkToken(presented, GOOD_TOKEN);
      const wrong = checkToken("x".repeat(MIN_TOKEN_LENGTH), GOOD_TOKEN);
      expect(absent).toEqual(wrong);
    },
  );

  // A short expected token means the server was misconfigured. Failing closed
  // beats accepting a guessable secret.
  it("refuses to authorise against an under-length expected token", () => {
    const weak = "s".repeat(MIN_TOKEN_LENGTH - 1);
    expect(checkToken(weak, weak)).toMatchObject({
      ok: false,
      reason: "unauthorized",
    });
  });
});

describe("checkOrigin", () => {
  it("accepts our extension", () => {
    expect(checkOrigin(`chrome-extension://${EXT_ID}`, EXT_ID)).toEqual({
      ok: true,
    });
  });

  it("rejects another extension", () => {
    expect(
      checkOrigin("chrome-extension://someotherextensionidhere00", EXT_ID),
    ).toMatchObject({
      ok: false,
      reason: "forbidden_origin",
    });
  });

  // Threat (1): a web page opening a socket to loopback. The browser stamps its
  // real origin and the page cannot lie about it.
  it("rejects a web page origin", () => {
    expect(checkOrigin("https://evil.example", EXT_ID)).toMatchObject({
      ok: false,
      reason: "forbidden_origin",
    });
  });

  it.each([undefined, null, "", "null"])("rejects %p", (origin) => {
    expect(checkOrigin(origin, EXT_ID)).toMatchObject({
      ok: false,
      reason: "forbidden_origin",
    });
  });

  // Substring confusion: an origin that merely contains our id is not our id.
  it("rejects an origin that only contains the extension id", () => {
    expect(
      checkOrigin(`https://evil.example/chrome-extension://${EXT_ID}`, EXT_ID),
    ).toMatchObject({
      ok: false,
    });
  });
});

describe("checkExtensionIdentity", () => {
  // A present Origin is authoritative — the web-page threat (1) is refused here,
  // and a matching Origin is accepted regardless of any body id.
  it("accepts a present, matching Origin", () => {
    expect(
      checkExtensionIdentity(`chrome-extension://${EXT_ID}`, undefined, EXT_ID),
    ).toEqual({ ok: true });
  });

  it("rejects a present, wrong Origin even if the body id is right", () => {
    // A web page cannot omit its Origin, so it can never reach the body-id
    // branch — a wrong Origin is a page attack and is refused outright.
    expect(
      checkExtensionIdentity("https://evil.example", EXT_ID, EXT_ID),
    ).toMatchObject({ ok: false, reason: "forbidden_origin" });
  });

  // The path that must succeed on a real device: the SW fetch sends no Origin,
  // so identity comes from the body-carried id.
  it.each([undefined, null, ""])(
    "accepts a matching body id when Origin is %p",
    (origin) => {
      expect(checkExtensionIdentity(origin, EXT_ID, EXT_ID)).toEqual({
        ok: true,
      });
    },
  );

  it("rejects a wrong body id when Origin is absent", () => {
    expect(
      checkExtensionIdentity(
        undefined,
        "someotherextensionidhere000000",
        EXT_ID,
      ),
    ).toMatchObject({ ok: false, reason: "forbidden_origin" });
  });

  it("rejects when both Origin and body id are absent", () => {
    expect(checkExtensionIdentity(undefined, undefined, EXT_ID)).toMatchObject({
      ok: false,
      reason: "forbidden_origin",
    });
  });
});
