import { describe, expect, it } from "vitest";

import { relinkInstalledHosts } from "../src/relink.js";
import { VALID_EXTENSION_ID, VALID_TOKEN, createMemIo } from "./helpers.js";

const WINDSURF = "/home/user/.codeium/windsurf/mcp_config.json";
const CODEX = "/home/user/.codex/config.toml";
const launch = { node: "/usr/bin/node", cli: "/usr/lib/node_modules/x/cli.js" };
const OPTS = {
  version: "1.12.0",
  token: VALID_TOKEN,
  extensionId: VALID_EXTENSION_ID,
  launch,
};

const npxEntry = {
  command: "npx",
  args: ["-y", "@modootoday/datalab-extension-mcp@1.11.5"],
  env: { DATALAB_MCP_TOKEN: VALID_TOKEN },
};

describe("relinkInstalledHosts", () => {
  it("rewrites our runner entry in a config file and leaves other servers alone", async () => {
    const other = { command: "uvx", args: ["other-server"] };
    const h = createMemIo({
      files: {
        [WINDSURF]: JSON.stringify({
          mcpServers: { datalab: npxEntry, other },
        }),
      },
    });
    const results = await relinkInstalledHosts(h.io, OPTS);
    const doc = JSON.parse(h.files.get(WINDSURF) as string);
    expect(doc.mcpServers.datalab).toMatchObject({
      command: launch.node,
      args: [launch.cli],
    });
    expect(doc.mcpServers.other).toEqual(other);
    expect(results).toMatchObject([{ hostId: "windsurf", status: "success" }]);
  });

  it("adds nothing to a host that does not have us", async () => {
    const h = createMemIo({ files: { [WINDSURF]: "{}\n" } });
    expect(await relinkInstalledHosts(h.io, OPTS)).toEqual([]);
    expect(h.files.get(WINDSURF)).toBe("{}\n");
  });

  it("leaves an entry that already runs the installed copy", async () => {
    const direct = { command: launch.node, args: [launch.cli], env: {} };
    const raw = JSON.stringify({ mcpServers: { datalab: direct } });
    const h = createMemIo({ files: { [WINDSURF]: raw } });
    expect(await relinkInstalledHosts(h.io, OPTS)).toEqual([]);
    expect(h.files.get(WINDSURF)).toBe(raw);
  });

  it("re-registers through a vendor CLI only when our server is there", async () => {
    const h = createMemIo({ cliBins: ["claude"] });
    await relinkInstalledHosts(h.io, OPTS);
    const add = h.spawns.find(
      (s) => s.command === "claude" && s.args[1] === "add",
    );
    expect(add?.args.slice(-3)).toEqual(["--", launch.node, launch.cli]);

    const unregistered = createMemIo({ cliBins: ["claude"] });
    const spawn = unregistered.io.spawn.bind(unregistered.io);
    unregistered.io.spawn = async (command, args, opts) =>
      args[1] === "get" ? { code: 1 } : spawn(command, args, opts);
    await relinkInstalledHosts(unregistered.io, OPTS);
    expect(unregistered.spawns.some((s) => s.args[1] === "add")).toBe(false);
  });

  it("swaps our TOML table when it runs the package runner", async () => {
    const raw = [
      "[mcp_servers.other]",
      'command = "uvx"',
      "",
      "[mcp_servers.datalab]",
      'command = "npx"',
      'args = ["-y", "@modootoday/datalab-extension-mcp@1.11.5"]',
      "",
      "[mcp_servers.datalab.env]",
      `DATALAB_MCP_TOKEN = "${VALID_TOKEN}"`,
      "",
    ].join("\n");
    const h = createMemIo({ files: { [CODEX]: raw } });
    await relinkInstalledHosts(h.io, OPTS);
    const after = h.files.get(CODEX) as string;
    expect(after).toContain(`command = '${launch.node}'`);
    expect(after).toContain('[mcp_servers.other]\ncommand = "uvx"');
    expect(after).not.toContain('command = "npx"');
  });

  it("does nothing without an installed copy to point at", async () => {
    const h = createMemIo({
      files: {
        [WINDSURF]: JSON.stringify({ mcpServers: { datalab: npxEntry } }),
      },
    });
    const { launch: _drop, ...noLaunch } = OPTS;
    expect(await relinkInstalledHosts(h.io, noLaunch)).toEqual([]);
  });
});
