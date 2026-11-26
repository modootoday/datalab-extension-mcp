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

import { SERVER_NAME } from "../src/hosts.js";
import { removeTomlServer, upsertTomlServer } from "../src/write-toml.js";
import { createTempIo } from "./helpers.js";
import type { Io } from "../src/types.js";

const SERVER = SERVER_NAME;
const HEADER = `[mcp_servers.${SERVER}]`;
const SNIPPET = [
  HEADER,
  'command = "npx"',
  'args = ["-y", "@modootoday/datalab-extension-mcp@1.2.3"]',
  "",
  `[mcp_servers.${SERVER}.env]`,
  'DATALAB_MCP_TOKEN = "t"',
].join("\n");

const LEGACY_OURS = [
  "[mcp_servers.datalab]",
  'command = "npx"',
  'args = ["-y", "@modootoday/datalab-extension-mcp@0.9.0"]',
  "",
  "[mcp_servers.datalab.env]",
  'DATALAB_MCP_TOKEN = "old"',
].join("\n");

const LEGACY_FOREIGN = [
  "[mcp_servers.datalab]",
  'command = "my-own-datalab"',
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
    expect(await read()).toContain(HEADER);
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
    expect(after).toContain(HEADER);
  });

  it("replaces our own table instead of adding a second one", async () => {
    await fs.writeFile(
      file,
      [
        HEADER,
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

    expect(after.split(HEADER)).toHaveLength(2);
    expect(after).toContain("@modootoday/datalab-extension-mcp@1.2.3");
    expect(after).not.toContain("0.9.0");
    expect(after).toContain("[mcp_servers.other]");
  });

  it("takes our env subtable with it and leaves the next table intact", async () => {
    const envHeader = `[mcp_servers.${SERVER}.env]`;
    await fs.writeFile(
      file,
      [
        HEADER,
        'command = "npx"',
        "",
        envHeader,
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
    expect(after.split(envHeader)).toHaveLength(2);
    expect(after).toContain("[mcp_servers.other]");
  });

  it("migrates a legacy table that runs our package", async () => {
    await fs.writeFile(
      file,
      ["# keep me", LEGACY_OURS, "", "[mcp_servers.other]", ""].join("\n"),
      "utf8",
    );

    const r = await upsertTomlServer(io, file, SNIPPET, SERVER);
    expect(r.ok && r.changed).toBe(true);

    const after = await read();
    expect(after).not.toContain("[mcp_servers.datalab]");
    expect(after).not.toContain("[mcp_servers.datalab.env]");
    expect(after).not.toContain("0.9.0");
    expect(after).toContain(HEADER);
    expect(after).toContain("# keep me");
    expect(after).toContain("[mcp_servers.other]");
  });

  it("leaves a foreign legacy-named table alone", async () => {
    await fs.writeFile(file, `${LEGACY_FOREIGN}\n`, "utf8");

    await upsertTomlServer(io, file, SNIPPET, SERVER);
    const after = await read();

    expect(after).toContain(LEGACY_FOREIGN);
    expect(after).toContain(HEADER);
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
      `[mcp_servers]\n${SERVER} = { command = "npx" }\n`,
      `mcp_servers.${SERVER} = { command = "npx" }\n`,
      `${HEADER}\ncommand = "a"\n\n${HEADER}\ncommand = "b"\n`,
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
        HEADER,
        'command = "npx"',
        "",
        `[mcp_servers.${SERVER}.env]`,
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
    expect(after).not.toContain(SERVER);
    expect(after).toContain("# keep me");
    expect(after).toContain("[mcp_servers.other]");
  });

  it("removes both our table and an owned legacy table", async () => {
    await fs.writeFile(
      file,
      [SNIPPET, "", LEGACY_OURS, "", "[mcp_servers.other]", ""].join("\n"),
      "utf8",
    );

    const r = await removeTomlServer(io, file, SERVER);
    expect(r.ok && r.changed).toBe(true);

    const after = await read();
    expect(after).not.toContain(HEADER);
    expect(after).not.toContain("[mcp_servers.datalab]");
    expect(after).toContain("[mcp_servers.other]");
  });

  it("removes an owned legacy table on its own", async () => {
    await fs.writeFile(file, `${LEGACY_OURS}\n`, "utf8");
    const r = await removeTomlServer(io, file, SERVER);
    expect(r.ok && r.changed).toBe(true);
    expect(await read()).not.toContain("[mcp_servers.datalab]");
  });

  it("keeps a foreign legacy-named table on uninstall", async () => {
    await fs.writeFile(file, `${LEGACY_FOREIGN}\n`, "utf8");
    expect(await removeTomlServer(io, file, SERVER)).toEqual({
      ok: true,
      changed: false,
    });
    expect(await read()).toBe(`${LEGACY_FOREIGN}\n`);
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
