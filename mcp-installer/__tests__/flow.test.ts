/**
 * Orchestrator flow against the in-memory seam: the single question, its skip
 * flag, host filtering, the zero-detection path, and the frozen closing copy.
 */
import { describe, expect, it } from "vitest";

import { SERVER_NAME } from "../src/hosts.js";
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
      (written["mcpServers"] as Record<string, unknown>)[SERVER_NAME],
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
      (written["mcpServers"] as Record<string, unknown>)[SERVER_NAME],
    ).toBeDefined();
  });

  it("clears the legacy CLI name before adding under the new one", async () => {
    const harness = twoHostSetup();
    await runInstall({ ...INSTALL_OPTS, yes: true }, harness.io);
    const lines = harness.spawns
      .filter((s) => s.command === "claude")
      .map((s) => s.args.slice(0, 3).join(" "));
    const legacy = lines.indexOf("mcp remove datalab");
    const add = lines.indexOf(`mcp add ${SERVER_NAME}`);
    expect(legacy).toBeGreaterThanOrEqual(0);
    expect(add).toBeGreaterThan(legacy);
  });

  it("draws three steps and groups both surfaces under each program", async () => {
    const harness = twoHostSetup();
    await runInstall({ ...INSTALL_OPTS, yes: true, skills: true }, harness.io);
    const text = harness.out.join("\n");
    for (const heading of [
      "━━ 1/3  AI 프로그램 찾기 ",
      "━━ 2/3  연결하기 ",
      "━━ 3/3  마무리 ",
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

  it("--skills registers the catalog with Claude Code's own command and guides Cursor by hand", async () => {
    const harness = twoHostSetup();
    await runInstall({ ...INSTALL_OPTS, yes: true, skills: true }, harness.io);
    expect(
      harness.spawns.map((s) => `${s.command} ${s.args.join(" ")}`),
    ).toContain(
      "claude mcp add --transport http modoo-today-skills https://skills.modoo.today/mcp --scope user",
    );
    const cursorConfig = JSON.parse(
      harness.files.get(CURSOR_PATH) as string,
    ) as { mcpServers: Record<string, unknown> };
    expect(Object.keys(cursorConfig.mcpServers)).toEqual([SERVER_NAME]);
    const text = harness.out.join("\n");
    expect(text).toContain("  ┃ Cursor 에 스킬 카탈로그 추가하기");
    expect(text).toContain("  ┃ 주소  https://skills.modoo.today/mcp");
  });

  it.each([
    ["the default", undefined],
    ["--no-skills", false],
  ])("%s connects the extension only", async (_name, skills) => {
    const harness = twoHostSetup();
    await runInstall({ ...INSTALL_OPTS, yes: true, skills }, harness.io);
    expect(
      harness.spawns.some((s) => s.args.includes("modoo-today-skills")),
    ).toBe(false);
    const text = harness.out.join("\n");
    expect(text).not.toContain("스킬 카탈로그");
    expect(text).not.toContain("modoo.today 로그인");
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
    const code = await runInstall(
      { ...INSTALL_OPTS, yes: true, skills: true },
      harness.io,
    );

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
      mcpServers: {
        [SERVER_NAME]: { command: "npx" },
        other: { command: "keep" },
      },
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
    expect(servers[SERVER_NAME]).toBeUndefined();
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

  it("removes both the new and the legacy name through the vendor CLI", async () => {
    const harness = createMemIo({
      platform: "linux",
      home: "/home/user",
      cliBins: ["claude"],
    });
    await runUninstall({ version: "1.2.3", yes: true }, harness.io);
    const removed = harness.spawns
      .filter((s) => s.command === "claude" && s.args[1] === "remove")
      .map((s) => s.args[2]);
    expect(removed).toContain(SERVER_NAME);
    expect(removed).toContain("datalab");
  });

  it("answering n changes nothing", async () => {
    const harness = createMemIo({
      platform: "linux",
      home: "/home/user",
      files: {
        [CURSOR_PATH]: JSON.stringify({ mcpServers: { [SERVER_NAME]: {} } }),
      },
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

describe("install without a key (bare install)", () => {
  const PAIRING_LINE = "연결을 허용할지 물어요";

  it("asks for nothing and writes no key, even with a person at the keyboard", async () => {
    const harness = createMemIo({
      platform: "linux",
      home: "/home/user",
      cliBins: ["gemini"],
      interactive: true,
      answers: ["y"],
    });
    const code = await runInstall({ version: "1.2.3" }, harness.io);

    expect(code).toBe(0);
    expect(harness.prompts).toHaveLength(0);
    const add = harness.spawns.find((s) => s.args.includes("add"));
    expect(add?.args.join(" ")).not.toContain("DATALAB_MCP_TOKEN");
    expect(add?.args.join(" ")).toContain("ldoknfkedngbdfgdkeicojmhnojgpdcb");
    expect(harness.out.some((l) => l.includes(PAIRING_LINE))).toBe(true);
  });

  it("finishes as an install when an older connector without a pid keeps the port", async () => {
    const harness = createMemIo({
      platform: "linux",
      home: "/home/user",
      cliBins: ["gemini"],
      interactive: false,
    });
    const io = {
      ...harness.io,
      fetch: (async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({
            name: "datalab-extension-mcp-server",
            version: "1.2.2",
          }),
        }) as Response) as unknown as typeof fetch,
    };
    const code = await runInstall({ version: "1.2.3", yes: true }, io);

    expect(code).toBe(0);
    const text = harness.out.join("\n");
    expect(text).toContain("설치는 끝났어요.");
    expect(text).toContain("5분쯤 기다린 뒤 다시 켜면");
    expect(text).not.toContain("실패");
  });

  it("runs down a pipe as well", async () => {
    const harness = createMemIo({
      platform: "linux",
      home: "/home/user",
      cliBins: ["gemini"],
      interactive: false,
    });
    const code = await runInstall({ version: "1.2.3", yes: true }, harness.io);

    expect(code).toBe(0);
    expect(harness.prompts).toHaveLength(0);
    expect(harness.spawns.some((s) => s.args.includes("add"))).toBe(true);
  });

  it("writes a passed key and says nothing about allowing the connection", async () => {
    const harness = createMemIo({
      platform: "linux",
      home: "/home/user",
      cliBins: ["gemini"],
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
    const add = harness.spawns.find((s) => s.args.includes("add"));
    expect(add?.args.join(" ")).toContain(`DATALAB_MCP_TOKEN=${VALID_TOKEN}`);
    expect(harness.out.some((l) => l.includes(PAIRING_LINE))).toBe(false);
  });
});
