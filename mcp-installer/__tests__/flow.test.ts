/**
 * Orchestrator flow against the in-memory Io: the one Y/n question, --yes,
 * --host filtering, the zero-detection path, and the frozen closing copy.
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
    expect(harness.asks).toEqual(["위 2개 프로그램에 연결할까요?"]);
    expect(harness.out).toContain("아무것도 바꾸지 않았어요.");
    // Nothing mutated: no add/remove spawns (detection --version calls only), no writes.
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
    // Claude CLI got an add invocation.
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
    // Cursor was excluded — its file is untouched.
    expect(harness.files.get(CURSOR_PATH)).toBe("{}\n");
  });

  it("zero detected hosts prints the download list and exits 1", async () => {
    const harness = createMemIo({ platform: "linux", home: "/home/user" });
    const code = await runInstall({ ...INSTALL_OPTS, yes: true }, harness.io);

    expect(code).toBe(1);
    const text = harness.out.join("\n");
    expect(text).toContain("연결할 수 있는 AI 프로그램을 찾지 못했어요.");
    expect(text).toContain("https://claude.ai/download");
    expect(text).toContain("https://code.visualstudio.com/");
    expect(harness.writes).toHaveLength(0);
  });

  it("ends a successful install with the byte-exact restart notice", async () => {
    const harness = twoHostSetup();
    const code = await runInstall({ ...INSTALL_OPTS, yes: true }, harness.io);

    expect(code).toBe(0);
    // Pinned as a literal on purpose — this is a frozen copy contract.
    expect(harness.out[harness.out.length - 1]).toBe(
      "마지막 한 단계: AI 앱을 완전히 종료했다가 다시 실행해 주세요.\n(Windows: 작업 표시줄 트레이 아이콘에서 종료)",
    );
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
    expect(harness.asks).toEqual(["위 1개 프로그램에서 연결을 해제할까요?"]);
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
    expect(text).toContain("연동 해제");
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
    expect(harness.out).toContain("아무것도 바꾸지 않았어요.");
  });
});

describe("interactive token flow (bare install)", () => {
  const HEX_TOKEN = "abcdef0123456789abcdef0123456789";

  it("prompts for the token when none is passed, then applies", async () => {
    // The bare `install` a user types: no --token, no --extension-id. A human
    // is at the keyboard (interactive true), so we ask and they paste.
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
    // The pasted token AND the defaulted store extension id reached the CLI.
    // CLI install is remove-then-add for idempotency; the token rides the ADD.
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
    // stdin piped: prompting would hang forever (the original "설치가 진행 안 됨").
    const harness = createMemIo({
      platform: "linux",
      home: "/home/user",
      cliBins: ["gemini"],
      interactive: false,
    });
    const code = await runInstall({ version: "1.2.3" }, harness.io);

    expect(code).toBe(1);
    expect(harness.prompts).toHaveLength(0);
    expect(harness.out.some((l) => l.includes("설치 명령 복사"))).toBe(true);
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
