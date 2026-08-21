/**
 * The TOML merge, byte-asserted on a real filesystem.
 *
 * The reason this file exists is the claim it has to keep true: a config full
 * of the user's comments, formatting and other servers comes back with only
 * our own table changed. Everything else is a refusal, and a refusal must
 * leave the file exactly as it was found.
 */
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { removeTomlServer, upsertTomlServer } from "../src/write-toml.js";
import { createTempIo } from "./helpers.js";
import type { Io } from "../src/types.js";

const SERVER = "datalab";
const SNIPPET = [
  "[mcp_servers.datalab]",
  'command = "npx"',
  'args = ["-y", "@modootoday/datalab-extension-mcp@1.2.3"]',
  "",
  "[mcp_servers.datalab.env]",
  'DATALAB_MCP_TOKEN = "t"',
].join("\n");

let home = "";
let io: Io;
let file = "";

beforeEach(async () => {
  home = await fs.mkdtemp(join(tmpdir(), "toml-write-test-"));
  io = createTempIo({ home }).io;
  file = join(home, "config.toml");
});

afterEach(async () => {
  await fs.rm(home, { recursive: true, force: true });
});

const read = (): Promise<string> => fs.readFile(file, "utf8");

describe("upsertTomlServer", () => {
  it("creates the file when absent, with no backup to make", async () => {
    const r = await upsertTomlServer(io, file, SNIPPET, SERVER);
    expect(r).toEqual({ ok: true, changed: true });
    expect(await read()).toContain("[mcp_servers.datalab]");
  });

  // The whole reason this is a text merge and not a parse-and-reserialise.
  it("keeps the user's comments, spacing and other servers byte for byte", async () => {
    const original = [
      "# my notes, please keep them",
      'model = "gpt-5"',
      "",
      "[mcp_servers.other]",
      'command = "other-cli"   # aligned on purpose',
      "",
    ].join("\n");
    await fs.writeFile(file, original, "utf8");

    const r = await upsertTomlServer(io, file, SNIPPET, SERVER);
    expect(r.ok && r.changed).toBe(true);

    const after = await read();
    expect(after).toContain("# my notes, please keep them");
    expect(after).toContain('command = "other-cli"   # aligned on purpose');
    expect(after).toContain('model = "gpt-5"');
    expect(after).toContain("[mcp_servers.datalab]");
  });

  it("replaces our own table instead of adding a second one", async () => {
    await fs.writeFile(
      file,
      [
        "[mcp_servers.datalab]",
        'command = "npx"',
        'args = ["-y", "@modootoday/datalab-extension-mcp@0.9.0"]',
        "",
        "[mcp_servers.other]",
        'command = "other-cli"',
      ].join("\n"),
      "utf8",
    );

    await upsertTomlServer(io, file, SNIPPET, SERVER);
    const after = await read();

    expect(after.match(/\[mcp_servers\.datalab\]/g)).toHaveLength(1);
    expect(after).toContain("@modootoday/datalab-extension-mcp@1.2.3");
    expect(after).not.toContain("0.9.0");
    expect(after).toContain("[mcp_servers.other]");
  });

  it("takes our env subtable with it and leaves the next table intact", async () => {
    await fs.writeFile(
      file,
      [
        "[mcp_servers.datalab]",
        'command = "npx"',
        "",
        "[mcp_servers.datalab.env]",
        'DATALAB_MCP_TOKEN = "stale"',
        "",
        "[mcp_servers.other]",
        'command = "other-cli"',
      ].join("\n"),
      "utf8",
    );

    await upsertTomlServer(io, file, SNIPPET, SERVER);
    const after = await read();

    expect(after).not.toContain("stale");
    expect(after.match(/\[mcp_servers\.datalab\.env\]/g)).toHaveLength(1);
    expect(after).toContain("[mcp_servers.other]");
  });

  it("backs up before changing an existing file", async () => {
    await fs.writeFile(file, "[mcp_servers.other]\n", "utf8");
    const r = await upsertTomlServer(io, file, SNIPPET, SERVER);
    expect(r.backupPath).toBeTruthy();
    expect(await fs.readFile(r.backupPath!, "utf8")).toBe(
      "[mcp_servers.other]\n",
    );
  });

  it("writes nothing when the file already says what we would write", async () => {
    await upsertTomlServer(io, file, SNIPPET, SERVER);
    const second = await upsertTomlServer(io, file, SNIPPET, SERVER);
    expect(second).toEqual({ ok: true, changed: false });
  });

  /**
   * An inline or dotted assignment puts our server somewhere this cannot edit
   * without either duplicating the key or dropping the user's version of it.
   * The snippet path is still a working answer; a mangled config is not.
   */
  it("refuses a shape it cannot locate, leaving the file untouched", async () => {
    for (const original of [
      '[mcp_servers]\ndatalab = { command = "npx" }\n',
      'mcp_servers.datalab = { command = "npx" }\n',
      '[mcp_servers.datalab]\ncommand = "a"\n\n[mcp_servers.datalab]\ncommand = "b"\n',
    ]) {
      await fs.writeFile(file, original, "utf8");
      const r = await upsertTomlServer(io, file, SNIPPET, SERVER);
      expect(r).toEqual({ ok: false, changed: false, reason: "parse" });
      expect(await read()).toBe(original);
      // A refusal leaves no backup either — the directory is untouched.
      const names = await fs.readdir(home);
      expect(names.filter((n) => n.includes("backup"))).toHaveLength(0);
    }
  });
});

describe("removeTomlServer", () => {
  it("removes only our table", async () => {
    await fs.writeFile(
      file,
      [
        "# keep me",
        "[mcp_servers.datalab]",
        'command = "npx"',
        "",
        "[mcp_servers.datalab.env]",
        'DATALAB_MCP_TOKEN = "t"',
        "",
        "[mcp_servers.other]",
        'command = "other-cli"',
      ].join("\n"),
      "utf8",
    );

    const r = await removeTomlServer(io, file, SERVER);
    expect(r.ok && r.changed).toBe(true);

    const after = await read();
    expect(after).not.toContain("datalab");
    expect(after).toContain("# keep me");
    expect(after).toContain("[mcp_servers.other]");
  });

  it("is a no-op when we were never there", async () => {
    await fs.writeFile(file, "[mcp_servers.other]\n", "utf8");
    expect(await removeTomlServer(io, file, SERVER)).toEqual({
      ok: true,
      changed: false,
    });
  });

  it("treats an absent file as already removed", async () => {
    const r = await removeTomlServer(io, file, SERVER);
    expect(r.ok).toBe(true);
    expect(r.changed).toBe(false);
  });
});
