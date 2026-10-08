import { describe, expect, it } from "vitest";

import { resolveConfig } from "../src/config.js";

/**
 * The allow-list is a list in shape and holds exactly one id in every
 * configuration this resolver can produce. Two would mean two installs behind
 * one pairing token, and a token belongs to the browser it was issued for —
 * so the seal is that no input spells a second one, not that a check refuses it.
 */
const base = {
  DATALAB_MCP_TOKEN: "t".repeat(64),
  DATALAB_MCP_EXTENSION_ID: "a".repeat(32),
};

const idsFor = (env: Record<string, string>): readonly string[] => {
  const resolved = resolveConfig(env);
  if (!resolved.ok) throw new Error(resolved.message);
  return resolved.config.extensionIds;
};

describe("허용 확장 목록", () => {
  it("어떤 입력을 줘도 원소는 하나다", () => {
    expect(idsFor(base)).toEqual(["a".repeat(32)]);
    expect(idsFor({ ...base, DATALAB_MCP_PORT: "9000" })).toHaveLength(1);
  });

  // A comma is not a separator here. Reading it as one would let a config file
  // name a second install, and it would also widen an alphabet the installer
  // narrowed on purpose before these values reach argv and files it writes.
  it("쉼표는 구분자가 아니다 — 통째로 하나의 id 다", () => {
    const two = `${"a".repeat(32)},${"b".repeat(32)}`;
    expect(idsFor({ ...base, DATALAB_MCP_EXTENSION_ID: two })).toEqual([two]);
  });

  it("빈 값은 설정 오류로 답한다 — 빈 목록으로 넘어가지 않는다", () => {
    const resolved = resolveConfig({ ...base, DATALAB_MCP_EXTENSION_ID: "  " });
    expect(resolved.ok).toBe(false);
  });
});
