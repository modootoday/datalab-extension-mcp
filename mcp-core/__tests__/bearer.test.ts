import { describe, expect, it } from "vitest";

import { BRIDGE_AUTH_CAPABILITY, bearerToken } from "../src/protocol.js";

/**
 * Both sides quote this one string. A rename on one side alone reads as a
 * panel that never declared the gate, so its session silently keeps the older,
 * open behaviour — a downgrade with nothing to notice.
 */
describe("브릿지 자격 증명 헤더", () => {
  it("능력 이름은 고정되어 있다", () => {
    expect(BRIDGE_AUTH_CAPABILITY).toBe("bridge-auth-bearer");
  });

  it("Bearer 뒤의 값을 꺼낸다", () => {
    expect(bearerToken("Bearer abc123")).toBe("abc123");
  });

  // Node lowercases incoming header names, but the scheme itself is what the
  // sender writes, and it is defined case-insensitive.
  it("스킴의 대소문자는 가리지 않는다", () => {
    expect(bearerToken("bearer abc123")).toBe("abc123");
  });

  it("앞뒤 공백이 있어도 읽는다", () => {
    expect(bearerToken("  Bearer abc123  ")).toBe("abc123");
  });

  it.each([
    ["없음", undefined],
    ["null", null],
    ["스킴 없이 값만", "abc123"],
    ["다른 스킴", "Basic abc123"],
    ["값이 빈 문자열", "Bearer "],
  ])("%s 은 자격 증명이 아니다", (_label, header) => {
    expect(bearerToken(header)).toBeNull();
  });
});
