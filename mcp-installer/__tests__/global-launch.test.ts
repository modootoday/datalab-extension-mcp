import { describe, expect, it } from "vitest";

import { installGlobally } from "../src/global-install.js";
import { buildFileEntry, launchArgv } from "../src/hosts/entries.js";
import { claudeCliHost } from "../src/hosts/claude.js";
import { geminiCliHost } from "../src/hosts/gemini.js";
import { tomlSnippet } from "../src/hosts/snippets.js";
import { quoteForCmd } from "../src/io.js";
import { runInstall } from "../src/run.js";
import { isLaunchPath } from "../src/validate.js";
import { VALID_EXTENSION_ID, VALID_TOKEN, createMemIo } from "./helpers.js";

const ROOT = "/usr/lib/node_modules";
const PKG_DIR = `${ROOT}/@modootoday/datalab-extension-mcp`;
const CLI = `${PKG_DIR}/dist/cli.js`;
const NODE = "/usr/bin/node";

function globalIo(opts: { version?: string; npm?: boolean } = {}) {
  const harness = createMemIo({
    platform: "linux",
    home: "/home/user",
    cliBins: opts.npm === false ? ["claude"] : ["claude", "npm"],
    files: {
      [`${PKG_DIR}/package.json`]: JSON.stringify({
        version: opts.version ?? "1.12.0",
      }),
      [CLI]: "",
      "/home/user/.cursor/mcp.json": "{}\n",
    },
  });
  harness.io.execPath = NODE;
  harness.io.npmRootGlobal = async () => ROOT;
  return harness;
}

const ENTRY = {
  version: "1.12.0",
  token: VALID_TOKEN,
  extensionId: VALID_EXTENSION_ID,
};

describe("installGlobally", () => {
  it("installs the exact version and resolves node plus the installed cli.js", async () => {
    const h = globalIo();
    const out = await installGlobally(h.io, "1.12.0", { inheritStdio: false });
    expect(out).toEqual({ ok: true, launch: { node: NODE, cli: CLI } });
    expect(h.spawns).toContainEqual({
      command: "npm",
      args: ["install", "-g", "@modootoday/datalab-extension-mcp@1.12.0"],
      shell: false,
      inheritStdio: false,
    });
  });

  it("falls back when npm cannot install", async () => {
    const h = globalIo({ npm: false });
    await expect(
      installGlobally(h.io, "1.12.0", { inheritStdio: false }),
    ).resolves.toEqual({ ok: false, reason: "install-failed" });
  });

  it("refuses a global copy at another version", async () => {
    const h = globalIo({ version: "1.11.5" });
    await expect(
      installGlobally(h.io, "1.12.0", { inheritStdio: false }),
    ).resolves.toEqual({ ok: false, reason: "not-found" });
  });

  it("refuses a path that could break out of a command line", async () => {
    const h = globalIo();
    h.io.execPath = 'C:\\a"b\\node.exe';
    await expect(
      installGlobally(h.io, "1.12.0", { inheritStdio: false }),
    ).resolves.toEqual({ ok: false, reason: "path" });
  });

  it("refuses a spec that is not a plain version before spawning", async () => {
    const h = globalIo();
    await expect(
      installGlobally(h.io, "latest", { inheritStdio: false }),
    ).resolves.toEqual({ ok: false, reason: "install-failed" });
    expect(h.spawns).toEqual([]);
  });
});

describe("direct launch entries", () => {
  const launch = {
    node: "C:\\Program Files\\nodejs\\node.exe",
    cli: "C:\\Users\\홍길동\\AppData\\Roaming\\npm\\node_modules\\@modootoday\\datalab-extension-mcp\\dist\\cli.js",
  };

  it("runs node directly, with no command interpreter even on Windows", () => {
    expect(buildFileEntry({ ...ENTRY, launch }, "win32")).toMatchObject({
      command: launch.node,
      args: [launch.cli],
    });
  });

  it("hands the same argv to vendor CLIs", () => {
    const claude = claudeCliHost.buildAddArgs({ ...ENTRY, launch });
    expect(claude.slice(-3)).toEqual(["--", launch.node, launch.cli]);
    const gemini = geminiCliHost.buildAddArgs({ ...ENTRY, launch });
    expect(gemini.slice(-3)).toEqual(["datalab", launch.node, launch.cli]);
  });

  it("keeps the package runner when no global copy is in hand", () => {
    expect(launchArgv(ENTRY)).toEqual([
      "npx",
      "-y",
      "@modootoday/datalab-extension-mcp@1.12.0",
    ]);
  });

  it("writes Windows paths into TOML as literal strings", () => {
    const toml = tomlSnippet({ ...ENTRY, launch });
    expect(toml).toContain(`command = '${launch.node}'`);
    expect(toml).toContain(`args = ['${launch.cli}']`);
  });
});

describe("launch path gate", () => {
  it("admits absolute paths with spaces, parentheses and non-ASCII folders", () => {
    expect(isLaunchPath("C:\\Program Files (x86)\\nodejs\\node.exe")).toBe(
      true,
    );
    expect(isLaunchPath("C:/Users/홍길동/AppData/Roaming/npm/x.js")).toBe(true);
    expect(isLaunchPath("/opt/homebrew/bin/node")).toBe(true);
  });

  it("rejects relative paths and every shell or TOML metacharacter", () => {
    for (const bad of [
      "node",
      'C:\\a"b',
      "C:\\a'b",
      "C:\\%PATH%",
      "C:\\a&b",
      "C:\\a|b",
      "C:\\a^b",
      "C:\\a!b",
      "/a<b",
      "/a$b",
    ]) {
      expect(isLaunchPath(bad), bad).toBe(false);
    }
  });

  it("quotes only what needs it on the Windows command line", () => {
    expect(quoteForCmd("mcp")).toBe("mcp");
    expect(quoteForCmd("C:\\Program Files\\nodejs\\node.exe")).toBe(
      '"C:\\Program Files\\nodejs\\node.exe"',
    );
  });
});

describe("install flow with a global copy", () => {
  it("installs globally, then registers the direct launch with every host", async () => {
    const h = globalIo();
    const code = await runInstall({ ...ENTRY, yes: true }, h.io);
    expect(code).toBe(0);
    const add = h.spawns.find(
      (s) => s.command === "claude" && s.args[1] === "add",
    );
    expect(add?.args.slice(-3)).toEqual(["--", NODE, CLI]);
    expect(h.out.some((line) => line.startsWith("  안내  "))).toBe(false);
  });

  it("says why and keeps the package runner when the global install fails", async () => {
    const h = globalIo({ npm: false });
    const code = await runInstall({ ...ENTRY, yes: true }, h.io);
    expect(code).toBe(0);
    const add = h.spawns.find(
      (s) => s.command === "claude" && s.args[1] === "add",
    );
    expect(add?.args).toContain("npx");
    expect(h.out).toContain(
      "  안내  이 컴퓨터에는 연결 프로그램을 설치하지 못했어요.",
    );
  });

  it("keeps npm's own output off the screen unless --verbose asks for it", async () => {
    const npmInstall = (h: ReturnType<typeof globalIo>) =>
      h.spawns.find((s) => s.command === "npm" && s.args[0] === "install");
    const quiet = globalIo({ npm: false });
    await runInstall({ ...ENTRY, yes: true }, quiet.io);
    expect(npmInstall(quiet)?.inheritStdio).toBe(false);

    const loud = globalIo({ npm: false });
    await runInstall({ ...ENTRY, yes: true, verbose: true }, loud.io);
    expect(npmInstall(loud)?.inheritStdio).toBe(true);
  });
});
