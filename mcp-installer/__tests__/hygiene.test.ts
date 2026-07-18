/**
 * The hygiene floor, byte-asserted against a real filesystem. These tests
 * deliberately do NOT mock fs: the whole point is to prove what actually
 * lands on the user's disk — foreign keys preserved, backups rotated, temp
 * files cleaned up, refusals leaving zero new files behind.
 */
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildFileEntry, type FileServerEntry } from "../src/hosts.js";
import { runInstall } from "../src/run.js";
import { removeServerKey, upsertServerKey } from "../src/write-json.js";
import type { Io } from "../src/types.js";
import { VALID_EXTENSION_ID, VALID_TOKEN, createTempIo } from "./helpers.js";

const ENTRY: FileServerEntry = buildFileEntry(
  { version: "1.2.3", token: VALID_TOKEN, extensionId: VALID_EXTENSION_ID },
  "linux",
);

let home = "";

beforeEach(async () => {
  home = await fs.mkdtemp(join(tmpdir(), "mcp-installer-test-"));
});

afterEach(async () => {
  await fs.rm(home, { recursive: true, force: true });
});

async function listDir(dir: string): Promise<string[]> {
  const names = await fs.readdir(dir);
  return names.sort();
}

describe("upsertServerKey", () => {
  it("adds only our key, preserves unknown keys, backs up, leaves no temp file", async () => {
    const { io } = createTempIo({ home });
    const dir = join(home, "cfg");
    await fs.mkdir(dir);
    const target = join(dir, "config.json");
    const original = JSON.stringify(
      {
        foreignString: "hello",
        foreignObject: { nested: { deep: [1, 2, 3] } },
        mcpServers: { other: { command: "something-else" } },
      },
      null,
      4,
    );
    await fs.writeFile(target, original, "utf8");

    const outcome = await upsertServerKey(io, target, ENTRY);
    expect(outcome.ok).toBe(true);
    expect(outcome.backupPath).toBeDefined();

    const before = JSON.parse(original) as Record<string, unknown>;
    const after = JSON.parse(await fs.readFile(target, "utf8")) as Record<
      string,
      unknown
    >;
    // Foreign keys survive the merge deep-equal.
    expect(after["foreignString"]).toEqual(before["foreignString"]);
    expect(after["foreignObject"]).toEqual(before["foreignObject"]);
    expect((after["mcpServers"] as Record<string, unknown>)["other"]).toEqual(
      (before["mcpServers"] as Record<string, unknown>)["other"],
    );
    expect((after["mcpServers"] as Record<string, unknown>)["datalab"]).toEqual(
      ENTRY,
    );

    // Backup holds the pre-write bytes exactly.
    const backupRaw = await fs.readFile(outcome.backupPath as string, "utf8");
    expect(backupRaw).toBe(original);

    // Directory contains exactly target + one backup: temp+rename left nothing.
    const names = await listDir(dir);
    expect(names).toHaveLength(2);
    expect(names).toContain("config.json");
    expect(names.some((n) => n.startsWith("config.json.backup-"))).toBe(true);
    expect(names.some((n) => n.includes(".tmp-"))).toBe(false);
  });

  it("keeps a bloated document's foreign keys byte-identical", async () => {
    const { io } = createTempIo({ home });
    const target = join(home, "claude.json");
    const bloated: Record<string, unknown> = {
      numStartups: 42,
      installMethod: "unknown",
      tipsHistory: { "tip-a": 3, "tip-b": 9 },
      projects: {
        "/some/dir": {
          allowedTools: ["a", "b"],
          history: [{ display: "x" }, { display: "y" }],
        },
        "/other/dir": { allowedTools: [], hasTrustDialogAccepted: true },
      },
      mcpServers: { existing: { command: "keep-me", args: ["--flag"] } },
    };
    await fs.writeFile(target, JSON.stringify(bloated, null, 2), "utf8");

    const outcome = await upsertServerKey(io, target, ENTRY);
    expect(outcome.ok).toBe(true);

    const after = JSON.parse(await fs.readFile(target, "utf8")) as Record<
      string,
      unknown
    >;
    for (const key of Object.keys(bloated)) {
      if (key === "mcpServers") {
        continue;
      }
      expect(JSON.stringify(after[key])).toBe(JSON.stringify(bloated[key]));
    }
    const servers = after["mcpServers"] as Record<string, unknown>;
    expect(JSON.stringify(servers["existing"])).toBe(
      JSON.stringify(
        (bloated["mcpServers"] as Record<string, unknown>)["existing"],
      ),
    );
    expect(servers["datalab"]).toEqual(ENTRY);
  });

  it("creates a fresh minimal file when only the parent directory exists", async () => {
    const { io } = createTempIo({ home });
    const dir = join(home, ".cursor");
    await fs.mkdir(dir);
    const target = join(dir, "mcp.json");

    const outcome = await upsertServerKey(io, target, ENTRY);
    expect(outcome.ok).toBe(true);
    expect(outcome.backupPath).toBeUndefined();

    const after = JSON.parse(await fs.readFile(target, "utf8")) as Record<
      string,
      unknown
    >;
    expect(after).toEqual({ mcpServers: { datalab: ENTRY } });
    // No backup for a file that did not exist.
    expect(await listDir(dir)).toEqual(["mcp.json"]);
  });

  it("rotates backups down to the newest three", async () => {
    const { io } = createTempIo({ home });
    const dir = join(home, "rot");
    await fs.mkdir(dir);
    const target = join(dir, "config.json");
    await fs.writeFile(target, "{}", "utf8");

    for (let i = 0; i < 4; i += 1) {
      const outcome = await upsertServerKey(io, target, ENTRY);
      expect(outcome.ok).toBe(true);
    }

    const backups = (await listDir(dir)).filter((n) =>
      n.startsWith("config.json.backup-"),
    );
    expect(backups).toHaveLength(3);
  });

  it("restores the newest backup when post-write verification fails", async () => {
    const original = JSON.stringify(
      { precious: true, mcpServers: {} },
      null,
      2,
    );
    let corruptedOnce = false;
    const { io } = createTempIo({
      home,
      overrides: {
        async writeFile(path: string, content: string): Promise<void> {
          // Corrupt only the FIRST temp write — the mutation. The backup write
          // before it and the restore write after it pass through untouched.
          if (!corruptedOnce && path.includes(".tmp-")) {
            corruptedOnce = true;
            await fs.writeFile(path, "{{{ corrupted, will not parse", "utf8");
            return;
          }
          await fs.writeFile(path, content, "utf8");
        },
      },
    });
    const dir = join(home, "restore");
    await fs.mkdir(dir);
    const target = join(dir, "config.json");
    await fs.writeFile(target, original, "utf8");

    const outcome = await upsertServerKey(io, target, ENTRY);
    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toBe("verify");

    // The target is back to its exact pre-write bytes.
    expect(await fs.readFile(target, "utf8")).toBe(original);
  });
});

describe("removeServerKey", () => {
  it("removes only our key, keeps foreign keys byte-identical, backs up", async () => {
    const { io } = createTempIo({ home });
    const dir = join(home, "rm");
    await fs.mkdir(dir);
    const target = join(dir, "config.json");
    const doc = {
      keepMe: { a: [1, 2], b: "text" },
      mcpServers: { datalab: ENTRY, other: { command: "keep" } },
    };
    await fs.writeFile(target, JSON.stringify(doc, null, 2), "utf8");

    const outcome = await removeServerKey(io, target);
    expect(outcome.ok).toBe(true);
    expect(outcome.changed).toBe(true);
    expect(outcome.backupPath).toBeDefined();

    const after = JSON.parse(await fs.readFile(target, "utf8")) as Record<
      string,
      unknown
    >;
    expect(JSON.stringify(after["keepMe"])).toBe(JSON.stringify(doc.keepMe));
    const servers = after["mcpServers"] as Record<string, unknown>;
    expect(servers["datalab"]).toBeUndefined();
    expect(JSON.stringify(servers["other"])).toBe(
      JSON.stringify(doc.mcpServers.other),
    );

    const backupRaw = await fs.readFile(outcome.backupPath as string, "utf8");
    expect(JSON.parse(backupRaw)).toEqual(doc);
  });

  it("leaves an emptied mcpServers object in place", async () => {
    const { io } = createTempIo({ home });
    const target = join(home, "solo.json");
    await fs.writeFile(
      target,
      JSON.stringify({ mcpServers: { datalab: ENTRY } }),
      "utf8",
    );

    const outcome = await removeServerKey(io, target);
    expect(outcome.ok).toBe(true);
    const after = JSON.parse(await fs.readFile(target, "utf8")) as Record<
      string,
      unknown
    >;
    expect(after["mcpServers"]).toEqual({});
  });

  it("reports nothing-to-do without writing when our key is absent", async () => {
    const { io } = createTempIo({ home });
    const dir = join(home, "noop");
    await fs.mkdir(dir);
    const target = join(dir, "config.json");
    const original = JSON.stringify({ mcpServers: { other: {} } });
    await fs.writeFile(target, original, "utf8");

    const outcome = await removeServerKey(io, target);
    expect(outcome.ok).toBe(true);
    expect(outcome.changed).toBe(false);
    expect(await fs.readFile(target, "utf8")).toBe(original);
    expect(await listDir(dir)).toEqual(["config.json"]);
  });
});

describe("unparseable tier-2 config through the full install flow", () => {
  it("refuses to write, leaves zero new files, reports failure with a snippet", async () => {
    const { io, out } = createTempIo({ home });
    const dir = join(home, ".cursor");
    await fs.mkdir(dir);
    const target = join(dir, "mcp.json");
    const garbage = '{"valid": "start"} trailing garbage that kills JSON.parse';
    await fs.writeFile(target, garbage, "utf8");

    const code = await runInstall(
      {
        version: "1.2.3",
        token: VALID_TOKEN,
        extensionId: VALID_EXTENSION_ID,
        yes: true,
      },
      io,
    );
    expect(code).toBe(1);

    // Bytes untouched AND no backup / temp file for a refused write.
    expect(await fs.readFile(target, "utf8")).toBe(garbage);
    expect(await listDir(dir)).toEqual(["mcp.json"]);

    const text = out.join("\n");
    expect(text).toContain("[실패]");
    expect(text).toContain("자동 수정하지 않아요");
    expect(text).toContain('"datalab"');
  });
});

describe("Cursor url entry — real filesystem", () => {
  const home = join(tmpdir(), `mcp-cursor-${process.pid}-${Date.now()}`);
  const URL_ENTRY: FileServerEntry = { url: "http://127.0.0.1:8765/mcp" };

  beforeEach(async () => {
    await fs.mkdir(home, { recursive: true });
  });
  afterEach(async () => {
    await fs.rm(home, { recursive: true, force: true });
  });

  it("merges a url entry, preserving unrelated keys byte-for-byte", async () => {
    const { io } = createTempIo({ home });
    const dir = join(home, ".cursor");
    await fs.mkdir(dir);
    const target = join(dir, "mcp.json");
    // A pre-existing Cursor config with a foreign server the user set up.
    const before = {
      mcpServers: { other: { url: "http://localhost:9999/x" } },
      someUnrelatedKey: { a: 1, nested: [true, "keep me"] },
    };
    await fs.writeFile(target, JSON.stringify(before, null, 2));

    const outcome = await upsertServerKey(io, target, URL_ENTRY);
    expect(outcome.ok).toBe(true);

    const after = JSON.parse(await fs.readFile(target, "utf8")) as Record<
      string,
      Record<string, unknown>
    >;
    // Our url entry landed.
    expect(after["mcpServers"]["datalab"]).toEqual(URL_ENTRY);
    // The foreign server AND the unrelated key are untouched.
    expect(after["mcpServers"]["other"]).toEqual(before.mcpServers.other);
    expect(after["someUnrelatedKey"]).toEqual(before.someUnrelatedKey);
    // A backup of the prior file exists.
    expect(outcome.backupPath).toBeDefined();
  });

  it("uninstall removes only our url entry", async () => {
    const { io } = createTempIo({ home });
    const dir = join(home, ".cursor");
    await fs.mkdir(dir);
    const target = join(dir, "mcp.json");
    await fs.writeFile(
      target,
      JSON.stringify({
        mcpServers: {
          datalab: URL_ENTRY,
          other: { url: "http://localhost:9999/x" },
        },
      }),
    );

    const outcome = await removeServerKey(io, target);
    expect(outcome.ok).toBe(true);

    const after = JSON.parse(await fs.readFile(target, "utf8")) as Record<
      string,
      Record<string, unknown>
    >;
    expect(after["mcpServers"]["datalab"]).toBeUndefined();
    expect(after["mcpServers"]["other"]).toEqual({
      url: "http://localhost:9999/x",
    });
  });
});
