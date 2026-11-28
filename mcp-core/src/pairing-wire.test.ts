import { describe, expect, it } from "vitest";

import {
  APP_NAME_MAX,
  PairingAnswerSchema,
  PairingRequestSchema,
  normalizeAppName,
} from "./pairing-wire.js";

describe("pairing wire", () => {
  it("keeps a printable app name and trims it", () => {
    expect(normalizeAppName("  Claude Desktop ")).toBe("Claude Desktop");
  });

  it("replaces control characters and cuts a long name", () => {
    expect(normalizeAppName("a\nb\u0000c")).toBe("a b c");
    expect(normalizeAppName("x".repeat(APP_NAME_MAX + 20))).toHaveLength(
      APP_NAME_MAX,
    );
  });

  it("has no name for a blank or non-string value", () => {
    expect(normalizeAppName("   ")).toBeNull();
    expect(normalizeAppName(undefined)).toBeNull();
    expect(normalizeAppName(7)).toBeNull();
  });

  it("accepts only the five actions", () => {
    const base = { token: "t" };
    for (const action of ["status", "approve", "refuse", "revoke", "unpair"]) {
      expect(PairingRequestSchema.safeParse({ ...base, action }).success).toBe(
        true,
      );
    }
    expect(
      PairingRequestSchema.safeParse({ ...base, action: "forget" }).success,
    ).toBe(false);
  });

  it("parses both answer shapes and refuses an unknown reason", () => {
    expect(
      PairingAnswerSchema.safeParse({ ok: false, reason: "window_closed" })
        .success,
    ).toBe(true);
    expect(
      PairingAnswerSchema.safeParse({ ok: false, reason: "nope" }).success,
    ).toBe(false);
    expect(
      PairingAnswerSchema.safeParse({
        ok: true,
        status: {
          paired: false,
          yours: false,
          windowOpen: true,
          windowEndsAt: 5,
          pending: [{ name: "Cursor", askedAt: 1 }],
          apps: [],
        },
      }).success,
    ).toBe(true);
  });
});
