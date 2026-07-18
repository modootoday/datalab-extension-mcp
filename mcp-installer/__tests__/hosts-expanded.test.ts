/**
 * Coverage for the expanded host matrix (2026-07 research wave) and the brand
 * banner. Tier-2 additions must WRITE their strict-JSON file; Tier-3 additions
 * must be detected, snippeted, and NEVER written. Real temp HOME throughout so
 * "we wrote exactly here / we touched nothing" is proven on disk.
 */
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runInstall } from "../src/run.js";
import { INSTALL_SUBTITLE } from "../src/banner.js";
import { VALID_EXTENSION_ID, VALID_TOKEN, createTempIo } from "./helpers.js";

const OPTS = {
  version: "1.2.3",
  token: VALID_TOKEN,
  extensionId: VALID_EXTENSION_ID,
  yes: true,
};

let home = "";

beforeEach(async () => {
  home = await fs.mkdtemp(join(tmpdir(), "mcp-installer-hosts-"));
});

afterEach(async () => {
  await fs.rm(home, { recursive: true, force: true });
});

async function datalabEntry(path: string): Promise<unknown> {
  const doc = JSON.parse(await fs.readFile(path, "utf8")) as {
    mcpServers?: Record<string, unknown>;
  };
  return doc.mcpServers?.["datalab"];
}

describe("brand banner", () => {
  it("prints the DATALAB art and the install subtitle first", async () => {
    const { io, out } = createTempIo({ home });
    // Zero hosts detected here — the banner must still lead the output.
    await runInstall(OPTS, io);
    const text = out.join("\n");
    expect(text).toContain("데이터랩툴즈 · datalab.tools");
    expect(text).toContain(`[데이터랩툴즈] ${INSTALL_SUBTITLE}`);
    // The art row is the very first non-empty line.
    const firstNonEmpty = out.find((l) => l.trim() !== "");
    expect(firstNonEmpty).toContain("█");
  });
});

describe("Tier 2 additions — auto-write strict JSON", () => {
  it("promotes Windsurf: writes mcp_config.json under ~/.codeium/windsurf", async () => {
    const dir = join(home, ".codeium", "windsurf");
    await fs.mkdir(dir, { recursive: true });
    const { io } = createTempIo({ home });

    const code = await runInstall(OPTS, io);
    expect(code).toBe(0);
    expect(await datalabEntry(join(dir, "mcp_config.json"))).toBeDefined();
  });

  it("writes Amazon Q config under ~/.aws/amazonq", async () => {
    const dir = join(home, ".aws", "amazonq");
    await fs.mkdir(dir, { recursive: true });
    const { io } = createTempIo({ home });

    const code = await runInstall(OPTS, io);
    expect(code).toBe(0);
    expect(await datalabEntry(join(dir, "mcp.json"))).toBeDefined();
  });

  it("writes JetBrains Junie config under ~/.junie/mcp", async () => {
    const dir = join(home, ".junie", "mcp");
    await fs.mkdir(dir, { recursive: true });
    const { io } = createTempIo({ home });

    const code = await runInstall(OPTS, io);
    expect(code).toBe(0);
    expect(await datalabEntry(join(dir, "mcp.json"))).toBeDefined();
  });

  it("writes Kiro config under ~/.kiro/settings", async () => {
    const dir = join(home, ".kiro", "settings");
    await fs.mkdir(dir, { recursive: true });
    const { io } = createTempIo({ home });

    const code = await runInstall(OPTS, io);
    expect(code).toBe(0);
    expect(await datalabEntry(join(dir, "mcp.json"))).toBeDefined();
  });

  it("preserves a foreign server already in Amazon Q's config", async () => {
    const dir = join(home, ".aws", "amazonq");
    await fs.mkdir(dir, { recursive: true });
    const target = join(dir, "mcp.json");
    const before = { mcpServers: { other: { command: "keep-me" } } };
    await fs.writeFile(target, JSON.stringify(before, null, 2), "utf8");

    const { io } = createTempIo({ home });
    const code = await runInstall(OPTS, io);
    expect(code).toBe(0);

    const doc = JSON.parse(await fs.readFile(target, "utf8")) as {
      mcpServers: Record<string, unknown>;
    };
    expect(doc.mcpServers["other"]).toEqual(before.mcpServers.other);
    expect(doc.mcpServers["datalab"]).toBeDefined();
  });
});

describe("Tier 3 additions — detect + snippet, never write", () => {
  it("snippets Cline from its VS Code globalStorage dir without writing", async () => {
    const dir = join(
      home,
      ".config",
      "Code",
      "User",
      "globalStorage",
      "saoudrizwan.claude-dev",
      "settings",
    );
    await fs.mkdir(dir, { recursive: true });
    const { io, out } = createTempIo({ home });

    const code = await runInstall(OPTS, io);
    expect(code).toBe(0);
    // No settings file was created.
    expect((await fs.readdir(dir)).sort()).toEqual([]);

    const text = out.join("\n");
    expect(text).toContain("Cline");
    expect(text).toContain("자동 수정하지 않아요");
    expect(text).toContain('"mcpServers"');
  });

  it("snippets LM Studio from ~/.lmstudio without writing", async () => {
    const dir = join(home, ".lmstudio");
    await fs.mkdir(dir, { recursive: true });
    const { io, out } = createTempIo({ home });

    const code = await runInstall(OPTS, io);
    expect(code).toBe(0);
    expect((await fs.readdir(dir)).sort()).toEqual([]);

    const text = out.join("\n");
    expect(text).toContain("LM Studio");
    expect(text).toContain("자동 수정하지 않아요");
  });

  it("snippets Warp from ~/.warp without writing", async () => {
    const dir = join(home, ".warp");
    await fs.mkdir(dir, { recursive: true });
    const { io, out } = createTempIo({ home });

    const code = await runInstall(OPTS, io);
    expect(code).toBe(0);
    expect((await fs.readdir(dir)).sort()).toEqual([]);
    expect(out.join("\n")).toContain("Warp");
  });
});

describe("zero-detected — optional CLI install offer", () => {
  it("offers, installs the pick via npm, re-scans, and connects", async () => {
    const installed = new Set<string>();
    const spawns: string[] = [];
    const { io, out } = createTempIo({
      home,
      overrides: {
        isInteractive: () => true,
        async prompt() {
          return "1"; // pick Claude Code
        },
        async spawn(command: string, args: string[]) {
          spawns.push(`${command} ${args.join(" ")}`);
          if (command === "npm" && args[0] === "install") {
            installed.add("claude");
            return { code: 0 };
          }
          if (command === "claude") {
            // detection (--version) only succeeds AFTER the npm install landed
            return installed.has("claude") ? { code: 0 } : { code: 1 };
          }
          return { code: 1 };
        },
      },
    });

    const code = await runInstall(OPTS, io);
    expect(code).toBe(0);
    // Offered the pick, installed the right npm package, then registered it.
    expect(
      spawns.some((s) => s === "npm install -g @anthropic-ai/claude-code"),
    ).toBe(true);
    expect(spawns.some((s) => s.startsWith("claude mcp add"))).toBe(true);
    expect(out.join("\n")).toContain("Claude Code");
  });

  it("declining (option 0) changes nothing and lists supported apps", async () => {
    const spawns: string[] = [];
    const { io, out } = createTempIo({
      home,
      overrides: {
        isInteractive: () => true,
        async prompt() {
          return "0"; // decline
        },
        async spawn(command: string, args: string[]) {
          spawns.push(`${command} ${args.join(" ")}`);
          return { code: 1 };
        },
      },
    });

    const code = await runInstall(OPTS, io);
    expect(code).toBe(1);
    // Declining must never spawn an npm install.
    expect(spawns.some((s) => s.startsWith("npm install"))).toBe(false);
    expect(out.join("\n")).toContain("지원하는 프로그램");
  });

  it("does not offer when non-interactive", async () => {
    const spawns: string[] = [];
    const { io } = createTempIo({
      home,
      overrides: {
        isInteractive: () => false,
        async spawn(command: string, args: string[]) {
          spawns.push(`${command} ${args.join(" ")}`);
          return { code: 1 };
        },
      },
    });

    const code = await runInstall(OPTS, io);
    expect(code).toBe(1);
    expect(spawns.some((s) => s.startsWith("npm install"))).toBe(false);
  });

  it("a failed npm install falls back to the supported-apps list", async () => {
    const { io, out } = createTempIo({
      home,
      overrides: {
        isInteractive: () => true,
        async prompt() {
          return "2"; // pick Gemini CLI
        },
        async spawn() {
          return { code: 1 }; // everything fails, including npm install
        },
      },
    });

    const code = await runInstall(OPTS, io);
    expect(code).toBe(1);
    expect(out.join("\n")).toContain("설치가 실패했어요");
    expect(out.join("\n")).toContain("지원하는 프로그램");
  });
});
