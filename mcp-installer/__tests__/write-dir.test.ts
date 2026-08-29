/**
 * The refusals are the point. A skills directory is shared with other tools,
 * so every test here that expects `ok: false` is asserting that we did NOT
 * touch something — a passing install path proves far less.
 */
import { describe, expect, it } from "vitest";

import {
  installSkillDir,
  MARKER_NAME,
  removeSkillDir,
} from "../src/write-dir.js";
import { createMemIo } from "./helpers.js";

const ROOT = "/home/u/.agents/skills";
const SLUG = "datalab-tone-manner";

const payload = {
  slug: SLUG,
  files: new Map([
    ["SKILL.md", "# 톤앤매너\n"],
    ["references/spec-format.md", "# 명세서 틀\n"],
  ]),
};

const io = () => createMemIo({ platform: "linux" }).io;

describe("installSkillDir", () => {
  it("파일을 놓고 표식을 남긴다", async () => {
    const mem = io();
    const out = await installSkillDir(mem, ROOT, payload, "1.8.0");
    expect(out.ok).toBe(true);
    expect(out.files).toEqual(["SKILL.md", "references/spec-format.md"]);
    expect(await mem.exists(`${ROOT}/${SLUG}/SKILL.md`)).toBe(true);
    expect(await mem.exists(`${ROOT}/${SLUG}/references/spec-format.md`)).toBe(
      true,
    );
    const marker = JSON.parse(
      await mem.readFile(`${ROOT}/${SLUG}/${MARKER_NAME}`),
    ) as { source: string; files: string[] };
    expect(marker.source).toBe("@modootoday/datalab-extension-mcp");
    expect(marker.files).toEqual(["SKILL.md", "references/spec-format.md"]);
  });

  it("우리가 놓은 것 위에는 다시 놓는다", async () => {
    const mem = io();
    await installSkillDir(mem, ROOT, payload, "1.8.0");
    const out = await installSkillDir(mem, ROOT, payload, "1.9.0");
    expect(out.ok).toBe(true);
  });

  /** A directory someone else made has no marker — leave it alone. */
  it("표식 없는 디렉토리는 건드리지 않는다", async () => {
    const mem = io();
    await mem.mkdir(`${ROOT}/${SLUG}`);
    await mem.writeFile(`${ROOT}/${SLUG}/SKILL.md`, "# 남의 것\n");
    const out = await installSkillDir(mem, ROOT, payload, "1.8.0");
    expect(out.ok).toBe(false);
    expect(out.refusal).toBe("unmarked");
    expect(await mem.readFile(`${ROOT}/${SLUG}/SKILL.md`)).toBe("# 남의 것\n");
  });

  it("다른 도구의 표식이면 거절한다", async () => {
    const mem = io();
    await mem.mkdir(`${ROOT}/${SLUG}`);
    await mem.writeFile(
      `${ROOT}/${SLUG}/${MARKER_NAME}`,
      JSON.stringify({ source: "gh-skill-install", files: ["SKILL.md"] }),
    );
    const out = await installSkillDir(mem, ROOT, payload, "1.8.0");
    expect(out.ok).toBe(false);
    expect(out.refusal).toBe("foreign");
  });

  it("표식이 깨졌으면 거절한다", async () => {
    const mem = io();
    await mem.mkdir(`${ROOT}/${SLUG}`);
    await mem.writeFile(`${ROOT}/${SLUG}/${MARKER_NAME}`, "{ 깨진");
    const out = await installSkillDir(mem, ROOT, payload, "1.8.0");
    expect(out.ok).toBe(false);
    expect(out.refusal).toBe("unreadable");
  });
});

describe("removeSkillDir", () => {
  it("우리가 쓴 파일만 지운다", async () => {
    const mem = io();
    await installSkillDir(mem, ROOT, payload, "1.8.0");
    // 사용자가 우리 디렉토리 안에 남긴 것.
    await mem.writeFile(`${ROOT}/${SLUG}/내메모.md`, "지우지 마세요\n");

    const out = await removeSkillDir(mem, ROOT, SLUG);
    expect(out.ok).toBe(true);
    expect(await mem.exists(`${ROOT}/${SLUG}/SKILL.md`)).toBe(false);
    expect(await mem.exists(`${ROOT}/${SLUG}/${MARKER_NAME}`)).toBe(false);
    // 우리가 안 쓴 파일은 살아남는다.
    expect(await mem.readFile(`${ROOT}/${SLUG}/내메모.md`)).toBe(
      "지우지 마세요\n",
    );
  });

  it("표식이 없으면 아무것도 안 지운다", async () => {
    const mem = io();
    await mem.mkdir(`${ROOT}/${SLUG}`);
    await mem.writeFile(`${ROOT}/${SLUG}/SKILL.md`, "# 남의 것\n");
    const out = await removeSkillDir(mem, ROOT, SLUG);
    expect(out.ok).toBe(false);
    expect(out.refusal).toBe("unmarked");
    expect(await mem.exists(`${ROOT}/${SLUG}/SKILL.md`)).toBe(true);
  });

  it("다른 도구가 설치한 같은 슬러그는 남는다", async () => {
    const mem = io();
    await mem.mkdir(`${ROOT}/${SLUG}`);
    await mem.writeFile(
      `${ROOT}/${SLUG}/${MARKER_NAME}`,
      JSON.stringify({ source: "gh-skill-install", files: ["SKILL.md"] }),
    );
    await mem.writeFile(`${ROOT}/${SLUG}/SKILL.md`, "# gh 가 놓음\n");
    const out = await removeSkillDir(mem, ROOT, SLUG);
    expect(out.ok).toBe(false);
    expect(out.refusal).toBe("foreign");
    expect(await mem.exists(`${ROOT}/${SLUG}/SKILL.md`)).toBe(true);
  });

  it("없는 것을 지우는 건 성공이다", async () => {
    const out = await removeSkillDir(io(), ROOT, "없는스킬");
    expect(out.ok).toBe(true);
    expect(out.files).toEqual([]);
  });
});
