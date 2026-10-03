/**
 * A vendor added to the MCP tables but forgotten in SKILL_HOSTS ships
 * silently unhandled — the exact failure the table exists to prevent. Types
 * enforce the shape inside a descriptor; only this enforces registration.
 */
import { describe, expect, it } from "vitest";

import {
  CLI_HOSTS,
  FILE_HOSTS,
  SKILL_HOSTS,
  SNIPPET_HOSTS,
} from "../src/hosts.js";
import { createMemIo } from "./helpers.js";

const mcpIds = [
  ...CLI_HOSTS.map((h) => h.id),
  ...FILE_HOSTS.map((h) => h.id),
  ...SNIPPET_HOSTS.map((h) => h.id),
];

describe("SKILL_HOSTS", () => {
  it("MCP 표의 모든 벤더가 스킬 계층을 선언한다", () => {
    const declared = new Set(SKILL_HOSTS.map((h) => h.id));
    const missing = mcpIds.filter((id) => !declared.has(id));
    expect(missing, `스킬 계층 미선언: ${missing.join(", ")}`).toEqual([]);
  });

  it("스킬만 있고 MCP 에 없는 벤더는 없다", () => {
    const known = new Set(mcpIds);
    const orphan = SKILL_HOSTS.filter((h) => !known.has(h.id)).map((h) => h.id);
    expect(orphan).toEqual([]);
  });

  /** No vendor takes a local directory, so a spawn tier would be a mistake. */
  it("스킬에는 tier 1 이 없다", () => {
    for (const host of SKILL_HOSTS) {
      expect(host.skills.tier).not.toBe(1);
    }
  });

  it("tier 2 는 경로를 내고, tier 3 은 사유와 안내를 낸다", () => {
    const io = createMemIo({ platform: "linux", home: "/home/u" }).io;
    for (const host of SKILL_HOSTS) {
      if (host.skills.tier === 2) {
        const dir = host.skills.skillsDir(io);
        expect(dir, `${host.id} 경로 없음`).toBeTruthy();
        expect(dir).toContain("/home/u/");
        expect(dir).toContain("skills");
      } else {
        expect(host.skills.reason.length).toBeGreaterThan(5);
        expect(host.skills.instruction.length).toBeGreaterThan(5);
      }
    }
  });

  /**
   * Nine vendors share one directory. If that stops being true the write
   * primitive's ownership marker becomes the only thing separating them, so the
   * count is asserted rather than assumed.
   */
  it("아홉 벤더가 같은 디렉토리를 공유한다", () => {
    const io = createMemIo({ platform: "linux", home: "/home/u" }).io;
    const shared = SKILL_HOSTS.filter(
      (h) =>
        h.skills.tier === 2 &&
        h.skills.skillsDir(io) === "/home/u/.agents/skills",
    );
    expect(shared.map((h) => h.id).sort()).toEqual([
      "codex",
      "copilot-cli",
      "cursor",
      "gemini",
      "opencode",
      "vscode",
      "warp",
      "windsurf",
      "zed",
    ]);
  });
});
