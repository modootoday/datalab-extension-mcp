/**
 * What a person reads. The installer decides what is true; these assert the
 * two things formatting can get wrong — refusing an action we do not have, and
 * printing a count where the truth is "someone else's".
 */
import { describe, expect, it } from "vitest";

import { runSkills, USAGE } from "../src/skills.js";

const capture = () => {
  const lines: string[] = [];
  return { lines, out: (line: string) => lines.push(line) };
};

const deps = (over: Partial<Parameters<typeof runSkills>[1]> = {}) => ({
  out: () => {},
  list: async () => [{ slug: "datalab-tone-manner", description: "문체." }],
  status: async () => ({ dirs: [], unsupported: [] }),
  attach: async () => ({ kind: "moved" as const, outcomes: [] }),
  detach: async () => ({ kind: "moved" as const, outcomes: [] }),
  ...over,
});

describe("skills", () => {
  it("행동을 안 주면 list 다", async () => {
    const { lines, out } = capture();
    expect(await runSkills([], deps({ out }))).toBe(0);
    expect(lines.join("\n")).toContain("datalab-tone-manner");
  });

  it("설명이 함께 나온다 — 슬러그만으로는 고를 수 없다", async () => {
    const { lines, out } = capture();
    await runSkills(["list"], deps({ out }));
    expect(lines.join("\n")).toContain("문체.");
  });

  it("모르는 행동은 거절이고, 종료 코드가 다르다", async () => {
    const { lines, out } = capture();
    expect(await runSkills(["purge"], deps({ out }))).toBe(2);
    expect(lines).toEqual([USAGE]);
  });

  it("남의 스킬은 설치 개수에 들어가지 않는다", async () => {
    const { lines, out } = capture();
    await runSkills(
      ["status"],
      deps({
        out,
        status: async () => ({
          dirs: [
            {
              dir: "/home/u/.agents/skills",
              hosts: ["Codex", "Cursor"],
              ours: [],
              refused: [
                { slug: "datalab-tone-manner", refusal: "foreign" as const },
              ],
              absent: [],
            },
          ],
          unsupported: [],
        }),
      }),
    );
    const text = lines.join("\n");
    expect(text).toContain("다른 도구가 설치한 스킬");
    expect(text).not.toContain("설치됨");
  });

  it("읽는 앱이 없으면 표를 지어내지 않는다", async () => {
    const { lines, out } = capture();
    await runSkills(["status"], deps({ out }));
    expect(lines.join("\n")).toContain("찾지 못했어요");
  });
});

describe("skills attach/detach", () => {
  const moved = (refusal?: "foreign") => ({
    kind: "moved" as const,
    outcomes: [
      {
        dir: "/home/u/.agents/skills",
        hosts: ["Cursor"],
        ...(refusal === undefined ? {} : { refusal }),
      },
    ],
  });

  it("슬러그 없이 부르면 무엇이 빠졌는지 말한다", async () => {
    const { lines, out } = capture();
    expect(await runSkills(["attach"], deps({ out }))).toBe(2);
    expect(lines).toEqual(["사용법: skills attach <slug>"]);
  });

  it("모르는 슬러그는 목록을 주고 종료 코드가 다르다", async () => {
    const { lines, out } = capture();
    const code = await runSkills(
      ["attach", "datalab-nope"],
      deps({
        out,
        attach: async () => ({
          kind: "unknown-slug" as const,
          shipped: ["datalab-tone-manner"],
        }),
      }),
    );
    expect(code).toBe(2);
    expect(lines.join("\n")).toContain("datalab-tone-manner");
  });

  /** A refusal is the ownership rule working, not a failed run. */
  it("거절은 실패가 아니다 — 어디였는지 말하고 0으로 끝난다", async () => {
    const { lines, out } = capture();
    const code = await runSkills(
      ["attach", "datalab-tone-manner"],
      deps({ out, attach: async () => moved("foreign") }),
    );
    expect(code).toBe(0);
    expect(lines.join("\n")).toContain("건너뜀");
    expect(lines.join("\n")).toContain("/home/u/.agents/skills");
  });

  it("detach 는 뺐다고 말한다", async () => {
    const { lines, out } = capture();
    await runSkills(
      ["detach", "datalab-tone-manner"],
      deps({ out, detach: async () => moved() }),
    );
    expect(lines.join("\n")).toContain("뺐어요");
  });
});
