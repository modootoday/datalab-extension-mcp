/**
 * Orchestrator flow against the in-memory seam: the single question, its skip
 * flag, host filtering, the zero-detection path, and the frozen closing copy.
 */
import { describe, expect, it } from "vitest";

import { runInstall, runUninstall } from "../src/run.js";
import { VALID_EXTENSION_ID, VALID_TOKEN, createMemIo } from "./helpers.js";

const INSTALL_OPTS = {
  version: "1.2.3",
  token: VALID_TOKEN,
  extensionId: VALID_EXTENSION_ID,
};
const CURSOR_PATH = "/home/user/.cursor/mcp.json";

function twoHostSetup(extra: { answers?: string[] } = {}) {
  return createMemIo({
    platform: "linux",
    home: "/home/user",
    cliBins: ["claude"],
    files: { [CURSOR_PATH]: "{}\n" },
    answers: extra.answers,
  });
}

describe("install flow", () => {
  it("asks the exact single question and answering n changes nothing", async () => {
    const harness = twoHostSetup({ answers: ["n"] });
    const code = await runInstall(INSTALL_OPTS, harness.io);

    expect(code).toBe(0);
    expect(harness.asks).toEqual(["  연결할까요?"]);
    expect(harness.out).toContain("  아무것도 바꾸지 않았어요.");
    // Nothing mutated: detection probes only, and no writes.
    expect(harness.spawns.every((s) => s.args.includes("--version"))).toBe(
      true,
    );
    expect(harness.writes).toHaveLength(0);
    expect(harness.files.get(CURSOR_PATH)).toBe("{}\n");
  });

  it("treats an empty answer as yes", async () => {
    const harness = twoHostSetup({ answers: [""] });
    const code = await runInstall(INSTALL_OPTS, harness.io);

    expect(code).toBe(0);
    const written = JSON.parse(
      harness.files.get(CURSOR_PATH) as string,
    ) as Record<string, unknown>;
    expect(
      (written["mcpServers"] as Record<string, unknown>)["datalab"],
    ).toBeDefined();
  });

  it("--yes skips the question entirely and applies", async () => {
    const harness = twoHostSetup();
    const code = await runInstall({ ...INSTALL_OPTS, yes: true }, harness.io);

    expect(code).toBe(0);
    expect(harness.asks).toHaveLength(0);
    // The selected CLI got an add invocation.
    expect(
      harness.spawns.some((s) => s.command === "claude" && s.args[1] === "add"),
    ).toBe(true);
    const written = JSON.parse(
      harness.files.get(CURSOR_PATH) as string,
    ) as Record<string, unknown>;
    expect(
      (written["mcpServers"] as Record<string, unknown>)["datalab"],
    ).toBeDefined();
  });

  it("draws four steps and groups both surfaces under each program", async () => {
    const harness = twoHostSetup();
    await runInstall({ ...INSTALL_OPTS, yes: true }, harness.io);
    const text = harness.out.join("\n");
    for (const heading of [
      "━━ 1/4  연결 키 ",
      "━━ 2/4  AI 프로그램 찾기 ",
      "━━ 3/4  연결하기 ",
      "━━ 4/4  마무리 ",
    ]) {
      expect(text).toContain(heading);
    }
    const claude = harness.out.indexOf("  Claude Code");
    expect(harness.out.slice(claude, claude + 3)).toEqual([
      "  Claude Code",
      "    완료  데이터랩툴즈 확장",
      "    완료  스킬 카탈로그",
    ]);
    const cursor = harness.out.indexOf("  Cursor");
    expect(harness.out.slice(cursor, cursor + 5)).toEqual([
      "  Cursor",
      "    완료  데이터랩툴즈 확장",
      "          설정 파일을 바꾸기 전에 백업했어요.",
      "    직접  스킬 카탈로그",
      "          (아래 안내)",
    ]);
  });

  it("registers the catalog with Claude Code's own command and guides Cursor by hand", async () => {
    const harness = twoHostSetup();
    await runInstall({ ...INSTALL_OPTS, yes: true }, harness.io);
    expect(
      harness.spawns.map((s) => `${s.command} ${s.args.join(" ")}`),
    ).toContain(
      "claude mcp add --transport http modoo-today-skills https://skills.modoo.today/mcp --scope user",
    );
    const cursorConfig = JSON.parse(
      harness.files.get(CURSOR_PATH) as string,
    ) as { mcpServers: Record<string, unknown> };
    expect(Object.keys(cursorConfig.mcpServers)).toEqual(["datalab"]);
    const text = harness.out.join("\n");
    expect(text).toContain("  ┃ Cursor 에 스킬 카탈로그 추가하기");
    expect(text).toContain("  ┃ 주소  https://skills.modoo.today/mcp");
  });

  it("--no-skills connects the extension only", async () => {
    const harness = twoHostSetup();
    await runInstall({ ...INSTALL_OPTS, yes: true, skills: false }, harness.io);
    expect(
      harness.spawns.some((s) => s.args.includes("modoo-today-skills")),
    ).toBe(false);
    expect(harness.out.join("\n")).not.toContain("스킬 카탈로그");
  });

  it("--host filters to the named host only", async () => {
    const harness = twoHostSetup();
    const code = await runInstall(
      { ...INSTALL_OPTS, yes: true, hosts: ["claude"] },
      harness.io,
    );

    expect(code).toBe(0);
    expect(
      harness.spawns.some((s) => s.command === "claude" && s.args[1] === "add"),
    ).toBe(true);
    // The excluded host's file is untouched.
    expect(harness.files.get(CURSOR_PATH)).toBe("{}\n");
  });

  it("zero detected hosts prints the download list and exits 1", async () => {
    const harness = createMemIo({ platform: "linux", home: "/home/user" });
    const code = await runInstall({ ...INSTALL_OPTS, yes: true }, harness.io);

    expect(code).toBe(1);
    const text = harness.out.join("\n");
    expect(text).toContain("연결할 수 있는 AI 프로그램을 찾지 못했어요.");
    expect(text).toContain("claude.ai/download");
    expect(text).toContain("code.visualstudio.com");
    expect(harness.writes).toHaveLength(0);
  });

  it("closes with the must-do card: restart, then the catalog sign-in", async () => {
    const harness = twoHostSetup();
    const code = await runInstall({ ...INSTALL_OPTS, yes: true }, harness.io);

    expect(code).toBe(0);
    // Pinned as literals: this is a frozen copy contract.
    const start = harness.out.indexOf("  ┃ 꼭 해 주세요");
    expect(harness.out.slice(start, start + 6)).toEqual([
      "  ┃ 꼭 해 주세요",
      "  ┃",
      "  ┃ 1. AI 프로그램을 완전히 종료했다가 다시 실행해 주세요.",
      "  ┃    Windows 는 작업 표시줄 트레이 아이콘에서 종료해요.",
      "  ┃ 2. 스킬 카탈로그를 처음 쓸 때 modoo.today 로그인 창이",
      "  ┃    열려요. 한 번 로그인하면 그다음부터는 자동이에요.",
    ]);
  });

  it("prints the ChatGPT pairing note for codex", async () => {
    const harness = createMemIo({
      platform: "linux",
      home: "/home/user",
      cliBins: ["codex"],
    });
    const code = await runInstall({ ...INSTALL_OPTS, yes: true }, harness.io);

    expect(code).toBe(0);
    expect(harness.out.join("\n")).toContain(
      "ChatGPT 데스크톱과 함께 연결돼요.",
    );
  });
});

describe("uninstall flow", () => {
  it("asks its own single question and removes only our key", async () => {
    const doc = {
      keepMe: { deeply: ["nested", 1] },
      mcpServers: { datalab: { command: "npx" }, other: { command: "keep" } },
    };
    const harness = createMemIo({
      platform: "linux",
      home: "/home/user",
      files: { [CURSOR_PATH]: JSON.stringify(doc, null, 2) },
      answers: ["y"],
    });
    const code = await runUninstall({ version: "1.2.3" }, harness.io);

    expect(code).toBe(0);
    expect(harness.asks).toEqual(["  연결을 해제할까요?"]);
    const after = JSON.parse(
      harness.files.get(CURSOR_PATH) as string,
    ) as Record<string, unknown>;
    expect(JSON.stringify(after["keepMe"])).toBe(JSON.stringify(doc.keepMe));
    const servers = after["mcpServers"] as Record<string, unknown>;
    expect(servers["datalab"]).toBeUndefined();
    expect(JSON.stringify(servers["other"])).toBe(
      JSON.stringify(doc.mcpServers.other),
    );

    const text = harness.out.join("\n");
    expect(text).toContain("정리가 끝났어요.");
    expect(text).toContain("이 브라우저 연결 끄기");
  });

  it("requires no token or extension id", async () => {
    const harness = createMemIo({
      platform: "linux",
      home: "/home/user",
      cliBins: ["claude"],
    });
    const code = await runUninstall(
      { version: "1.2.3", yes: true },
      harness.io,
    );

    expect(code).toBe(0);
    expect(
      harness.spawns.some(
        (s) => s.command === "claude" && s.args[1] === "remove",
      ),
    ).toBe(true);
  });

  it("answering n changes nothing", async () => {
    const harness = createMemIo({
      platform: "linux",
      home: "/home/user",
      files: { [CURSOR_PATH]: JSON.stringify({ mcpServers: { datalab: {} } }) },
      answers: ["n"],
    });
    const code = await runUninstall({ version: "1.2.3" }, harness.io);

    expect(code).toBe(0);
    expect(harness.writes).toHaveLength(0);
    expect(harness.out).toContain("  아무것도 바꾸지 않았어요.");
  });

  it("takes the catalog out where its own command put it", async () => {
    const harness = createMemIo({
      platform: "linux",
      home: "/home/user",
      cliBins: ["claude"],
    });
    await runUninstall({ version: "1.2.3", yes: true }, harness.io);
    expect(
      harness.spawns.map((s) => `${s.command} ${s.args.join(" ")}`),
    ).toContain("claude mcp remove modoo-today-skills --scope user");
    expect(harness.out).toContain("    완료  스킬 카탈로그 해제");
  });
});

describe("interactive token flow (bare install)", () => {
  const HEX_TOKEN = "abcdef0123456789abcdef0123456789";

  it("prompts for the token when none is passed, then applies", async () => {
    // The short command a user types, carrying no credentials, with a human at
    // the keyboard to paste the token.
    const harness = createMemIo({
      platform: "linux",
      home: "/home/user",
      cliBins: ["gemini"],
      interactive: true,
      prompts: [HEX_TOKEN],
      answers: ["y"],
    });
    const code = await runInstall({ version: "1.2.3" }, harness.io);

    expect(code).toBe(0);
    // It asked for the token exactly once.
    expect(harness.prompts).toHaveLength(1);
    // Both the pasted token and the defaulted extension id reached the CLI.
    // Install is remove-then-add, and the token rides the add.
    const add = harness.spawns.find((s) => s.args.includes("add"));
    expect(add?.args.join(" ")).toContain(HEX_TOKEN);
    expect(add?.args.join(" ")).toContain("ldoknfkedngbdfgdkeicojmhnojgpdcb");
  });

  it("re-asks once on a malformed paste, then accepts", async () => {
    const harness = createMemIo({
      platform: "linux",
      home: "/home/user",
      cliBins: ["gemini"],
      interactive: true,
      prompts: ["not a token", HEX_TOKEN],
      answers: ["y"],
    });
    const code = await runInstall({ version: "1.2.3" }, harness.io);

    expect(code).toBe(0);
    expect(harness.prompts).toHaveLength(2);
    expect(harness.out.some((l) => l.includes("다시 복사"))).toBe(true);
  });

  it("does NOT prompt down a pipe — it tells the user how to pass the token", async () => {
    // With stdin piped, prompting would hang forever.
    const harness = createMemIo({
      platform: "linux",
      home: "/home/user",
      cliBins: ["gemini"],
      interactive: false,
    });
    const code = await runInstall({ version: "1.2.3" }, harness.io);

    expect(code).toBe(1);
    expect(harness.prompts).toHaveLength(0);
    // Names where the command lives: the settings page, step 2's copy button.
    expect(harness.out.some((l) => l.includes("연결 키가 필요해요"))).toBe(
      true,
    );
    expect(harness.out.some((l) => l.includes("다른 AI 앱에 연결"))).toBe(true);
    // Nothing was mutated.
    expect(harness.spawns.every((s) => s.args.includes("--version"))).toBe(
      true,
    );
  });

  it("a passed --token skips the prompt (panel copy-button path)", async () => {
    const harness = createMemIo({
      platform: "linux",
      home: "/home/user",
      cliBins: ["gemini"],
      interactive: true,
      answers: ["y"],
    });
    const code = await runInstall(
      {
        version: "1.2.3",
        token: VALID_TOKEN,
        extensionId: VALID_EXTENSION_ID,
        yes: true,
      },
      harness.io,
    );

    expect(code).toBe(0);
    expect(harness.prompts).toHaveLength(0);
  });
});
