/**
 * Snippet hosts: detected, explained, printed — and 🔴 never written. The
 * byte-identity assertions run against a real temp home, because a claim to
 * have left someone's file alone has to be proven on disk.
 */
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runInstall } from "../src/run.js";
import { VALID_EXTENSION_ID, VALID_TOKEN, createTempIo } from "./helpers.js";

const OPTS = {
  version: "1.2.3",
  token: VALID_TOKEN,
  extensionId: VALID_EXTENSION_ID,
  yes: true,
};

let home = "";

beforeEach(async () => {
  home = await fs.mkdtemp(join(tmpdir(), "mcp-installer-tier3-"));
});

afterEach(async () => {
  await fs.rm(home, { recursive: true, force: true });
});

describe("JSONC hosts", () => {
  it("leaves a commented Zed settings file byte-identical and prints the snippet", async () => {
    const zedDir = join(home, ".config", "zed");
    await fs.mkdir(zedDir, { recursive: true });
    const settingsPath = join(zedDir, "settings.json");
    const jsonc = [
      "// Zed settings — comments make this JSONC, not JSON",
      "{",
      '  "theme": "One Dark", // trailing comment',
      '  "vim_mode": true,',
      "}",
      "",
    ].join("\n");
    await fs.writeFile(settingsPath, jsonc, "utf8");

    const { io, out } = createTempIo({ home });
    const code = await runInstall(OPTS, io);

    // Snippet hosts only, so nothing was attempted and nothing failed.
    expect(code).toBe(0);
    // COMPLETELY untouched, byte for byte.
    expect(await fs.readFile(settingsPath, "utf8")).toBe(jsonc);
    expect((await fs.readdir(zedDir)).sort()).toEqual(["settings.json"]);

    const text = out.join("\n");
    expect(text).toContain("[건너뜀]");
    expect(text).toContain("주석이 있는 설정 파일이라 자동 수정하지 않아요.");
    expect(text).toContain("context_servers");
  });

  /**
   * 🔴 An absent file is created. Writing is refused because an existing file
   * cannot be merged safely, and that reason does not apply when there is
   * nothing there — these hosts create their config on first use, so a fresh
   * install has none.
   */
  it("🔴 creates mcp.json when the profile dir exists but the file does not", async () => {
    const codeDir = join(home, ".config", "Code", "User");
    await fs.mkdir(codeDir, { recursive: true });

    const { io, out } = createTempIo({ home });
    const exitCode = await runInstall(OPTS, io);

    expect(exitCode).toBe(0);
    expect((await fs.readdir(codeDir)).sort()).toEqual(["mcp.json"]);

    // This host uses its own top-level key, unlike the rest.
    const written: unknown = JSON.parse(
      await fs.readFile(join(codeDir, "mcp.json"), "utf8"),
    );
    const servers = (written as { servers?: Record<string, unknown> }).servers;
    expect(servers).toBeDefined();
    expect(Object.keys(servers ?? {})).toEqual(["datalab"]);

    const text = out.join("\n");
    expect(text).toContain("VS Code");
    expect(text).toContain("새로 만들었어요");
  });

  /**
   * 🔴 An existing file is still never touched: creating an absent one did not
   * widen that invariant, and merging into a commented file loses comments.
   */
  it("🔴 leaves an EXISTING commented mcp.json byte-identical", async () => {
    const codeDir = join(home, ".config", "Code", "User");
    await fs.mkdir(codeDir, { recursive: true });
    const mcpPath = join(codeDir, "mcp.json");
    const jsonc = [
      "// my servers — this comment must survive",
      "{",
      '  "servers": {',
      '    "mine": { "command": "node", "args": ["x.js"] },',
      "  },",
      "}",
      "",
    ].join("\n");
    await fs.writeFile(mcpPath, jsonc, "utf8");

    const { io, out } = createTempIo({ home });
    const exitCode = await runInstall(OPTS, io);

    expect(exitCode).toBe(0);
    expect(await fs.readFile(mcpPath, "utf8")).toBe(jsonc);

    const text = out.join("\n");
    expect(text).toContain("자동 수정하지 않아요");
    expect(text).toContain('"servers"');
    expect(text).not.toContain("새로 만들었어요");
  });

  /**
   * 🔴 With not even the directory present, nothing is created: the app has
   * never run, and placing a file at a guessed path reports success the app
   * never reads.
   */
  it("🔴 does not invent a config tree when VS Code was never launched", async () => {
    const { io } = createTempIo({ home });
    await runInstall(OPTS, io);
    expect(await pathExists(join(home, ".config", "Code"))).toBe(false);
  });
});

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

describe("TOML host (Codex config without the CLI)", () => {
  /**
   * 🔴 This desktop app installs no CLI and creates its config only when a
   * server is first registered, so both detection paths can miss it while the
   * app is plainly installed.
   */
  it("🔴 creates config.toml when ~/.codex exists but the file does not", async () => {
    const codexDir = join(home, ".codex");
    await fs.mkdir(codexDir, { recursive: true });

    const { io, out } = createTempIo({ home });
    const exitCode = await runInstall(OPTS, io);

    expect(exitCode).toBe(0);
    const written = await fs.readFile(join(codexDir, "config.toml"), "utf8");
    // This host's table name differs from the JSON hosts' key.
    expect(written).toContain("[mcp_servers.datalab]");
    expect(written).toContain('command = "npx"');
    expect(out.join("\n")).toContain("새로 만들었어요");
  });

  /**
   * 🔴 With not even the directory present, nothing is created: there is no
   * way to confirm the app is installed without guessing, and a guessed write
   * is a false success. The user gets the create-it hint instead.
   */
  it("🔴 does not invent ~/.codex when nothing is there", async () => {
    const { io } = createTempIo({ home });
    await runInstall(OPTS, io);
    let there = true;
    try {
      await fs.stat(join(home, ".codex"));
    } catch {
      there = false;
    }
    expect(there).toBe(false);
  });

  it("leaves config.toml untouched and prints the [mcp_servers.datalab] block", async () => {
    const codexDir = join(home, ".codex");
    await fs.mkdir(codexDir, { recursive: true });
    const tomlPath = join(codexDir, "config.toml");
    const toml = [
      'model = "o4"',
      "",
      "[profiles.default]",
      'approval = "never"',
      "",
    ].join("\n");
    await fs.writeFile(tomlPath, toml, "utf8");

    const { io, out } = createTempIo({ home });
    const code = await runInstall(OPTS, io);

    expect(code).toBe(0);
    expect(await fs.readFile(tomlPath, "utf8")).toBe(toml);
    expect((await fs.readdir(codexDir)).sort()).toEqual(["config.toml"]);

    const text = out.join("\n");
    expect(text).toContain("자동 수정하지 않아요");
    expect(text).toContain("[mcp_servers.datalab]");
    expect(text).toContain(`DATALAB_MCP_TOKEN = "${VALID_TOKEN}"`);
  });

  it("does not demote codex when the CLI is present", async () => {
    const codexDir = join(home, ".codex");
    await fs.mkdir(codexDir, { recursive: true });
    await fs.writeFile(join(codexDir, "config.toml"), 'model = "o4"\n', "utf8");

    const spawns: string[] = [];
    const { io, out } = createTempIo({
      home,
      overrides: {
        async spawn(command: string, args: string[]) {
          spawns.push(`${command} ${args.join(" ")}`);
          if (command === "codex") {
            return { code: 0 };
          }
          return { code: 1 };
        },
      },
    });
    const code = await runInstall(OPTS, io);

    expect(code).toBe(0);
    // The CLI host handled it, so no snippet block appears.
    expect(out.join("\n")).not.toContain("[mcp_servers.datalab]");
    expect(spawns.some((s) => s.startsWith("codex mcp add"))).toBe(true);
  });

  it("linux Claude Desktop dir triggers the snippet, never a guessed write", async () => {
    const claudeDir = join(home, ".config", "Claude");
    await fs.mkdir(claudeDir, { recursive: true });

    const { io, out } = createTempIo({ home, platform: "linux" });
    const code = await runInstall(OPTS, io);

    expect(code).toBe(0);
    // Nothing appeared inside the app dir.
    expect((await fs.readdir(claudeDir)).sort()).toEqual([]);

    const text = out.join("\n");
    expect(text).toContain(
      "리눅스용 공식 설정 파일 경로가 확인되지 않아 자동 수정하지 않아요.",
    );
    expect(text).toContain("claude_desktop_config.json");
    expect(text).toContain("mcpServers");
  });
});
