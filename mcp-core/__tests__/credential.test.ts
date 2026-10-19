import { describe, expect, it } from "vitest";

import { resolveCredential } from "../src/credential.js";

const ROOT = "pairing-token-that-is-long-enough-32";

const present = (over: Partial<Parameters<typeof resolveCredential>[0]> = {}) =>
  resolveCredential(
    { token: ROOT, browserId: "brw-a", ...over },
    { rootToken: ROOT },
  );

/**
 * One secret per machine. The key decides whether a handshake is admitted; the
 * name it gives decides where calls land, and earns nothing on its own.
 */
describe("자격 판정", () => {
  it("키를 든 브라우저는 자기 이름으로 들어온다", () => {
    expect(present()).toEqual({ kind: "claimed", browserId: "brw-a" });
  });

  it("같은 키의 다른 이름은 다른 브라우저다", () => {
    expect(present({ browserId: "brw-b" })).toEqual({
      kind: "claimed",
      browserId: "brw-b",
    });
  });

  it("틀린 키는 거절이다", () => {
    expect(
      present({ token: "wrong-but-long-enough-to-pass-32-x" }),
    ).toMatchObject({ kind: "refused", reason: "unauthorized" });
  });

  /**
   * A session nothing can address is not worth admitting: datalab_browsers
   * routes by this name, and a nameless one could never be chosen.
   */
  it("이름 없는 악수는 거절이다", () => {
    for (const browserId of [undefined, ""]) {
      expect(present({ browserId })).toMatchObject({
        kind: "refused",
        reason: "unauthorized",
      });
    }
  });

  // Timing-independent comparison is the point; a prefix must not pass.
  it("키의 앞부분만으로는 못 들어온다", () => {
    expect(present({ token: ROOT.slice(0, -1) })).toMatchObject({
      kind: "refused",
      reason: "unauthorized",
    });
  });
});
