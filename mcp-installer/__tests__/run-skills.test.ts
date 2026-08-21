/**
 * Two properties matter here and neither is "it copied files": skills go
 * only to hosts this run actually detected, and a host that refuses says so
 * instead of being skipped in silence.
 */
import { describe, expect, it } from "vitest";

import {
  conditionalSlugs,
  placeSkills,
  removeSkills,
  stagedSlugs,
} from "../src/run-skills.js";
import { MARKER_NAME } from "../src/write-dir.js";
import { createNodeIo } from "../src/io.js";
import { createMemIo } from "./helpers.js";

const PAYLOAD = "/pkg/skills";
const HOME = "/home/u";

/** The staged tarball payload, as `copy-skills.mjs` leaves it. */
const staged = {
  [`${PAYLOAD}/datalab-tone-manner/SKILL.md`]: "# 톤앤매너\n",
  [`${PAYLOAD}/datalab-tone-manner/references/spec-format.md`]: "# 틀\n",
  [`${PAYLOAD}/datalab-cta-rewrite/SKILL.md`]: "# CTA\n",
};

const io = () =>
  createMemIo({ platform: "linux", home: HOME, files: staged }).io;

describe("placeSkills", () => {
  it("감지된 호스트에만 놓는다", async () => {
    const mem = io();
    const out = await placeSkills(mem, PAYLOAD, new Set(["cursor"]), "1.8.0");
    expect(out.map((r) => r.hostId)).toEqual(["cursor"]);
    expect(
      await mem.exists(`${HOME}/.agents/skills/datalab-cta-rewrite/SKILL.md`),
    ).toBe(true);
  });

  /** A host the user does not have must never be written to. */
  it("감지 안 된 호스트에는 아무것도 안 쓴다", async () => {
    const mem = io();
    await placeSkills(mem, PAYLOAD, new Set(["cursor"]), "1.8.0");
    expect(await mem.exists(`${HOME}/.claude/skills`)).toBe(false);
    expect(await mem.exists(`${HOME}/.kiro/skills`)).toBe(false);
  });

  it("공유 경로 호스트가 여럿이어도 같은 곳에 놓는다", async () => {
    const mem = io();
    const out = await placeSkills(
      mem,
      PAYLOAD,
      new Set(["cursor", "zed", "warp"]),
      "1.8.0",
    );
    expect(out).toHaveLength(3);
    expect(out.every((r) => r.status === "success")).toBe(true);
  });

  /** A refusing host reports, it does not vanish from the table. */
  it("거절 호스트가 사유를 남긴다", async () => {
    const out = await placeSkills(
      io(),
      PAYLOAD,
      new Set(["lmstudio"]),
      "1.8.0",
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.status).toBe("skipped");
    expect(out[0]?.surface).toBe("skills");
    expect(out[0]?.message).toContain("스킬(SKILL.md) 개념이 없어요");
  });

  it("남의 것이 있으면 건너뛰고 그 사실을 말한다", async () => {
    const mem = createMemIo({
      platform: "linux",
      home: HOME,
      files: {
        ...staged,
        [`${HOME}/.agents/skills/datalab-cta-rewrite/${MARKER_NAME}`]:
          JSON.stringify({ source: "gh-skill-install", files: [] }),
      },
    }).io;
    const out = await placeSkills(mem, PAYLOAD, new Set(["cursor"]), "1.8.0");
    expect(out[0]?.message).toContain("다른 도구가 설치한");
    expect(
      await mem.readFile(
        `${HOME}/.agents/skills/datalab-cta-rewrite/${MARKER_NAME}`,
      ),
    ).toContain("gh-skill-install");
  });

  it("스테이징이 없으면 아무 행도 내지 않는다", async () => {
    const mem = createMemIo({ platform: "linux", home: HOME }).io;
    expect(
      await placeSkills(mem, PAYLOAD, new Set(["cursor"]), "1.8.0"),
    ).toEqual([]);
  });
});

describe("removeSkills", () => {
  it("우리가 놓은 것을 지운다", async () => {
    const mem = io();
    await placeSkills(mem, PAYLOAD, new Set(["cursor"]), "1.8.0");
    const out = await removeSkills(mem, new Set(["cursor"]), [
      "datalab-cta-rewrite",
    ]);
    expect(out[0]?.status).toBe("success");
    expect(
      await mem.exists(`${HOME}/.agents/skills/datalab-cta-rewrite/SKILL.md`),
    ).toBe(false);
  });

  it("남의 것은 남기고 남겼다고 말한다", async () => {
    const mem = createMemIo({
      platform: "linux",
      home: HOME,
      files: {
        [`${HOME}/.agents/skills/datalab-cta-rewrite/${MARKER_NAME}`]:
          JSON.stringify({ source: "gh-skill-install", files: ["SKILL.md"] }),
        [`${HOME}/.agents/skills/datalab-cta-rewrite/SKILL.md`]: "# gh\n",
      },
    }).io;
    const out = await removeSkills(mem, new Set(["cursor"]), [
      "datalab-cta-rewrite",
    ]);
    expect(out[0]?.message).toContain("우리가 설치한 것이 아니라");
    expect(
      await mem.exists(`${HOME}/.agents/skills/datalab-cta-rewrite/SKILL.md`),
    ).toBe(true);
  });
});

describe("기본집합", () => {
  const many = {
    [`${PAYLOAD}/datalab-tone-manner/SKILL.md`]: "a",
    [`${PAYLOAD}/datalab-card-news/SKILL.md`]: "b",
    [`${PAYLOAD}/datalab-video-script/SKILL.md`]: "c",
    [`${PAYLOAD}/datalab-photo-prompt/SKILL.md`]: "d",
  };
  const mem = () => createMemIo({ platform: "linux", home: HOME, files: many });

  it("조건부 3종은 기본 설치에서 빠진다", async () => {
    const m = mem();
    await placeSkills(m.io, PAYLOAD, new Set(["cursor"]), "1.8.0");
    const at = `${HOME}/.agents/skills`;
    expect(await m.io.exists(`${at}/datalab-tone-manner`)).toBe(true);
    for (const held of conditionalSlugs()) {
      expect(await m.io.exists(`${at}/${held}`)).toBe(false);
    }
  });

  it("뺀 것이 있으면 말한다 — 침묵은 부분 실패로 읽힌다", async () => {
    const m = mem();
    const out = await placeSkills(m.io, PAYLOAD, new Set(["cursor"]), "1.8.0");
    // The count is the point, and it is all this line carries: naming a command
    // to run would name one this reader has no terminal habit for, once per
    // host.
    expect(out[0]?.message).toContain("조건부 3개 제외");
    expect(out[0]?.message).not.toContain("skills list");
  });

  it("all 이면 전부 넣는다", async () => {
    const m = mem();
    await placeSkills(m.io, PAYLOAD, new Set(["cursor"]), "1.8.0", true);
    for (const held of conditionalSlugs()) {
      expect(await m.io.exists(`${HOME}/.agents/skills/${held}`)).toBe(true);
    }
  });

  /**
   * A renamed skill would drop out of the map silently and ship all twelve
   * again — the failure would be a token budget, not an error.
   */
  it("보류 목록의 이름이 전부 실재한다", async () => {
    // Real filesystem, and it has to find the tree in BOTH layouts this
    // package is tested in. In the monorepo the authoring tree is two levels
    // up; in the published mirror the packages are siblings and the payload
    // is staged under mcp/. Naming only the first shipped a release that
    // failed in the mirror's own CI, which is where nobody was watching.
    const io = createNodeIo();
    const candidates = [
      `${process.cwd()}/../../skills`,
      `${process.cwd()}/../mcp/skills`,
    ];
    let shipped: readonly string[] = [];
    for (const root of candidates) {
      shipped = await stagedSlugs(io, root);
      if (shipped.length > 0) break;
    }
    expect(shipped.length).toBeGreaterThan(0);
    for (const held of conditionalSlugs()) {
      expect(shipped).toContain(held);
    }
  });
});
