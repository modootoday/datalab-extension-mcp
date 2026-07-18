/**
 * CLI argv construction and input validation. The exact arrays are contracts:
 * a missing `--scope user` silently binds the server to whatever directory
 * the user pasted the command in, so the flags are pinned element by element.
 */
import { describe, expect, it } from "vitest";

import {
  CLI_HOSTS,
  FILE_HOSTS,
  buildEntryForHost,
  buildEnv,
  buildFileEntry,
  packageSpec,
  type CliHost,
  type ServerEntryOptions,
} from "../src/hosts.js";
import { runInstall } from "../src/run.js";
import { VALID_EXTENSION_ID, VALID_TOKEN, createMemIo } from "./helpers.js";

const OPTS: ServerEntryOptions = {
  version: "1.2.3",
  token: VALID_TOKEN,
  extensionId: VALID_EXTENSION_ID,
};

function host(id: string): CliHost {
  const found = CLI_HOSTS.find((h) => h.id === id);
  if (found === undefined) {
    throw new Error(`missing host ${id}`);
  }
  return found;
}

describe("claude CLI args", () => {
  it("builds the exact add argv with --scope user", () => {
    expect(host("claude").buildAddArgs(OPTS)).toEqual([
      "mcp",
      "add",
      "datalab",
      "--scope",
      "user",
      "--env",
      `DATALAB_MCP_TOKEN=${VALID_TOKEN}`,
      "--env",
      `DATALAB_MCP_EXTENSION_ID=${VALID_EXTENSION_ID}`,
      "--",
      "npx",
      "-y",
      "@modootoday/datalab-extension-mcp@1.2.3",
    ]);
  });

  it("adds DATALAB_MCP_PORT only for a non-default port", () => {
    const withPort = host("claude").buildAddArgs({ ...OPTS, port: "9000" });
    expect(withPort).toContain("DATALAB_MCP_PORT=9000");
    const defaultPort = host("claude").buildAddArgs({ ...OPTS, port: "8765" });
    expect(defaultPort.join(" ")).not.toContain("DATALAB_MCP_PORT");
  });

  it("builds the exact remove argv with --scope user", () => {
    expect(host("claude").buildRemoveArgs()).toEqual([
      "mcp",
      "remove",
      "datalab",
      "--scope",
      "user",
    ]);
  });
});

describe("gemini CLI args", () => {
  it("builds the exact add argv with -s user", () => {
    expect(host("gemini").buildAddArgs(OPTS)).toEqual([
      "mcp",
      "add",
      "-s",
      "user",
      "-e",
      `DATALAB_MCP_TOKEN=${VALID_TOKEN}`,
      "-e",
      `DATALAB_MCP_EXTENSION_ID=${VALID_EXTENSION_ID}`,
      "datalab",
      "npx",
      "-y",
      "@modootoday/datalab-extension-mcp@1.2.3",
    ]);
  });

  it("builds the exact remove argv with -s user", () => {
    expect(host("gemini").buildRemoveArgs()).toEqual([
      "mcp",
      "remove",
      "-s",
      "user",
      "datalab",
    ]);
  });
});

describe("codex CLI args", () => {
  it("ends with the -- npx -y package spec tail", () => {
    const args = host("codex").buildAddArgs(OPTS);
    expect(args.slice(-4)).toEqual([
      "--",
      "npx",
      "-y",
      "@modootoday/datalab-extension-mcp@1.2.3",
    ]);
    expect(args.slice(0, 3)).toEqual(["mcp", "add", "datalab"]);
  });

  it("builds the exact remove argv", () => {
    expect(host("codex").buildRemoveArgs()).toEqual([
      "mcp",
      "remove",
      "datalab",
    ]);
  });
});

describe("file entry", () => {
  it("uses cmd /c npx on win32 (npx is a .cmd shim there)", () => {
    const entry = buildFileEntry(OPTS, "win32");
    expect(entry.command).toBe("cmd");
    expect(entry.args).toEqual([
      "/c",
      "npx",
      "-y",
      "@modootoday/datalab-extension-mcp@1.2.3",
    ]);
  });

  it("uses plain npx elsewhere", () => {
    const entry = buildFileEntry(OPTS, "darwin");
    expect(entry.command).toBe("npx");
    expect(entry.args).toEqual([
      "-y",
      "@modootoday/datalab-extension-mcp@1.2.3",
    ]);
  });

  it("gives Cursor a url entry (HTTP MCP direct), not an adapter command", () => {
    const cursor = FILE_HOSTS.find((h) => h.id === "cursor")!;
    const entry = buildEntryForHost(cursor, OPTS, "win32") as {
      url?: string;
      command?: string;
      env?: unknown;
    };
    // No adapter to spawn, no secret on the line — the daemon holds the token.
    expect(entry.url).toBe("http://127.0.0.1:8765/mcp");
    expect(entry.command).toBeUndefined();
    expect(entry.env).toBeUndefined();
  });

  it("Cursor's url tracks a custom port", () => {
    const cursor = FILE_HOSTS.find((h) => h.id === "cursor")!;
    const entry = buildEntryForHost(
      cursor,
      { ...OPTS, port: "9001" },
      "darwin",
    );
    expect(entry).toEqual({ url: "http://127.0.0.1:9001/mcp" });
  });

  it("Claude Desktop still gets the stdio adapter command, never a url", () => {
    const claude = FILE_HOSTS.find((h) => h.id === "claude-desktop")!;
    const entry = buildEntryForHost(claude, OPTS, "darwin") as {
      command?: string;
      url?: string;
    };
    expect(entry.command).toBe("npx");
    expect(entry.url).toBeUndefined();
  });

  it("omits the port env at the default port and includes it otherwise", () => {
    expect(buildEnv(OPTS)).toEqual({
      DATALAB_MCP_TOKEN: VALID_TOKEN,
      DATALAB_MCP_EXTENSION_ID: VALID_EXTENSION_ID,
    });
    expect(buildEnv({ ...OPTS, port: "8765" })).not.toHaveProperty(
      "DATALAB_MCP_PORT",
    );
    expect(buildEnv({ ...OPTS, port: "9000" })).toHaveProperty(
      "DATALAB_MCP_PORT",
      "9000",
    );
  });

  it("builds the package spec from the exact version", () => {
    expect(packageSpec("1.2.3")).toBe(
      "@modootoday/datalab-extension-mcp@1.2.3",
    );
  });
});

describe("input validation happens before any io", () => {
  async function expectRefused(
    opts: Parameters<typeof runInstall>[0],
  ): Promise<void> {
    const harness = createMemIo({ cliBins: ["claude"] });
    const code = await runInstall(opts, harness.io);
    expect(code).toBe(1);
    // Refusal must land BEFORE detection or writes — nothing spawned, nothing
    // written. (The brand banner prints first via io.out, which is neither a
    // spawn nor a write, so the refusal message is asserted by presence rather
    // than by output position.)
    expect(harness.spawns).toHaveLength(0);
    expect(harness.writes).toHaveLength(0);
    expect(harness.out.join("\n")).toMatch(/올바르지 않아요/);
  }

  it("refuses a malformed token", async () => {
    await expectRefused({
      version: "1.2.3",
      token: "not-hex!",
      extensionId: VALID_EXTENSION_ID,
    });
  });

  it("refuses a malformed extension id", async () => {
    await expectRefused({
      version: "1.2.3",
      token: VALID_TOKEN,
      extensionId: "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
    });
  });

  it("refuses a malformed version", async () => {
    await expectRefused({
      version: "1.2",
      token: VALID_TOKEN,
      extensionId: VALID_EXTENSION_ID,
    });
  });

  it("refuses a malformed port", async () => {
    await expectRefused({
      version: "1.2.3",
      token: VALID_TOKEN,
      extensionId: VALID_EXTENSION_ID,
      port: "1",
    });
  });
});
