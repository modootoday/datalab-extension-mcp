/**
 * Tier-3 hosts: detected, explained, snippeted — and NEVER written. The
 * byte-identity assertions run against a real temp HOME because "we did not
 * touch your file" is exactly the kind of claim that must be proven on disk.
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

    // Tier 3 only — nothing attempted, nothing failed.
    expect(code).toBe(0);
    // COMPLETELY untouched, byte for byte.
    expect(await fs.readFile(settingsPath, "utf8")).toBe(jsonc);
    expect((await fs.readdir(zedDir)).sort()).toEqual(["settings.json"]);

    const text = out.join("\n");
    expect(text).toContain("[건너뜀]");
    expect(text).toContain("주석이 있는 설정 파일이라 자동 수정하지 않아요.");
    expect(text).toContain("context_servers");
  });

  it("prints the servers-keyed snippet for a detected VS Code profile", async () => {
    const codeDir = join(home, ".config", "Code", "User");
    await fs.mkdir(codeDir, { recursive: true });

    const { io, out } = createTempIo({ home });
    const exitCode = await runInstall(OPTS, io);

    expect(exitCode).toBe(0);
    // No mcp.json was created — detection of the profile dir never writes.
    expect((await fs.readdir(codeDir)).sort()).toEqual([]);

    const text = out.join("\n");
    expect(text).toContain("VS Code");
    expect(text).toContain("자동 수정하지 않아요");
    expect(text).toContain('"servers"');
  });
});

describe("TOML host (Codex config without the CLI)", () => {
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
    // Tier 1 handled it — no TOML snippet block appears.
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
