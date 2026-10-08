import { describe, expect, it } from "vitest";

import { createUi, displayWidth, terminalCaps } from "../src/ui.js";

const ESC = "\x1b[";

function capsFor(
  env: Record<string, string>,
  opts: { tty?: boolean; platform?: NodeJS.Platform } = {},
) {
  return terminalCaps({
    platform: opts.platform ?? "linux",
    env,
    stdoutIsTTY: opts.tty ?? true,
  });
}

function draw(color: boolean, unicode = true): string[] {
  const lines: string[] = [];
  const ui = createUi((line) => lines.push(line), { color, unicode });
  ui.step(1, 4, "연결 키");
  ui.host("Cursor");
  ui.status("완료", "데이터랩툴즈 확장", "설정 파일을 바꾸기 전에 백업했어요.");
  ui.card("attention", "꼭 해 주세요", ["한 줄"]);
  return lines;
}

describe("terminal capabilities", () => {
  it("colours a terminal and nothing else", () => {
    expect(capsFor({}).color).toBe(true);
    expect(capsFor({}, { tty: false }).color).toBe(false);
    expect(capsFor({ NO_COLOR: "1" }).color).toBe(false);
    expect(capsFor({ TERM: "dumb" }).color).toBe(false);
  });

  it("FORCE_COLOR colours a pipe, and FORCE_COLOR=0 does not", () => {
    expect(capsFor({ FORCE_COLOR: "1" }, { tty: false }).color).toBe(true);
    expect(capsFor({ FORCE_COLOR: "0" }, { tty: false }).color).toBe(false);
  });

  it("falls back to ASCII only on the legacy Windows console", () => {
    expect(capsFor({}, { platform: "win32" }).unicode).toBe(false);
    expect(capsFor({ WT_SESSION: "x" }, { platform: "win32" }).unicode).toBe(
      true,
    );
    expect(
      capsFor({ TERM_PROGRAM: "vscode" }, { platform: "win32" }).unicode,
    ).toBe(true);
    expect(capsFor({}, { platform: "darwin" }).unicode).toBe(true);
  });
});

describe("display width", () => {
  it("counts a Korean syllable as two columns", () => {
    expect(displayWidth("Cursor")).toBe(6);
    expect(displayWidth("연결 키")).toBe(7);
  });
});

describe("drawing", () => {
  it("writes no escape codes when colour is off", () => {
    expect(draw(false).some((line) => line.includes(ESC))).toBe(false);
  });

  it("carries the same words with colour on", () => {
    const strip = (line: string) =>
      line
        .split(ESC)
        .map((part, i) => (i === 0 ? part : part.replace(/^[0-9;]*m/u, "")))
        .join("");
    expect(draw(true).some((line) => line.includes(ESC))).toBe(true);
    expect(draw(true).map(strip)).toEqual(draw(false));
  });

  it("fills every step rule to the same width", () => {
    const rule = draw(false).find((line) => line.startsWith("━━"));
    expect(displayWidth(rule ?? "")).toBe(56);
  });

  it("indents a status detail under its label", () => {
    expect(draw(false)).toEqual(
      expect.arrayContaining([
        "    완료  데이터랩툴즈 확장",
        "          설정 파일을 바꾸기 전에 백업했어요.",
      ]),
    );
  });

  it("swaps every box glyph for ASCII", () => {
    const lines = draw(false, false);
    expect(lines.join("\n")).not.toMatch(/[━═┃·]/u);
    expect(lines).toContain("  | 꼭 해 주세요");
  });
});
