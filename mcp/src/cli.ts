#!/usr/bin/env node
/**
 * `datalab-extension-mcp` — the bin an MCP host spawns.
 *
 * Three roles, one bin:
 *   - default (no subcommand): the thin stdio adapter, which an MCP host spawns
 *     and which proxies to the background daemon.
 *   - `serve`: run the daemon in this process. This is what the adapter spawns
 *     (`node <thisBin> serve`), and it starts the inlined mcp-server.
 *   - `install` / `uninstall`: the install helper, unchanged.
 *
 * Deliberately thin. The adapter, the daemon, and the installer all live in
 * testable modules or their own packages; this file is only argv routing and
 * process wiring, which is why it is excluded from the coverage gate.
 */
import { createRequire } from "node:module";

import { runDaemon } from "@modootoday/extension-app-mcp-server";

import { dispatchCli, runAdapter } from "./adapter.js";

const NAME = "datalab-extension-mcp";

/**
 * The version we report, read from the manifest rather than typed out here.
 *
 * It was typed out here once, and it said 0.0.1 for the whole of 0.0.2 — the MCP
 * handshake told the host a version that had not shipped for a while. Nothing
 * breaks loudly when this drifts, which is exactly why it drifted: the only
 * symptom is a debug session chasing the wrong build.
 *
 * `dist/cli.js` → `../package.json` is the manifest npm publishes alongside it,
 * so this resolves in the tarball as well as from source. Kept out of a tsup
 * `define` on purpose: the mirror generates its own tsup config, and a
 * build-time constant would have to be reproduced there to stay true.
 */
const VERSION = (
  createRequire(import.meta.url)("../package.json") as { version: string }
).version;

/**
 * Anything we print must go to stderr.
 *
 * stdout is the MCP transport: a stray `console.log` there is a protocol frame
 * as far as the host is concerned, and corrupts the session. The spec is
 * explicit that stderr is free for any logging and that a client must not read
 * it as failure.
 */
function log(message: string): void {
  process.stderr.write(`[${NAME}] ${message}\n`);
}

/**
 * `install` / `uninstall` subcommands — the install helper.
 *
 * Same bin on purpose: the helper always runs at exactly the version it will
 * write into host configs (its own), which closes the gap between "the version
 * the user ran" and "the version the config now names". Loaded lazily so the
 * adapter path never pays for it.
 */
async function runInstaller(
  sub: "install" | "uninstall",
  argv: readonly string[],
): Promise<never> {
  const { createNodeIo, runInstall, runUninstall } =
    await import("@modootoday/extension-app-mcp-installer");

  const opts: {
    version: string;
    token?: string;
    extensionId?: string;
    port?: string;
    yes?: boolean;
    hosts?: string[];
  } = { version: VERSION };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--token") opts.token = argv[(i += 1)];
    else if (flag === "--extension-id") opts.extensionId = argv[(i += 1)];
    else if (flag === "--port") opts.port = argv[(i += 1)];
    else if (flag === "--yes" || flag === "-y") opts.yes = true;
    else if (flag === "--host") {
      opts.hosts = opts.hosts ?? [];
      const host = argv[(i += 1)];
      if (host) opts.hosts.push(host);
    }
    // Unknown flags are ignored rather than fatal: a future panel may emit a
    // flag this (pinned) helper predates, and refusing would strand the user.
  }

  const io = createNodeIo();
  let code: number;
  if (sub === "install") {
    code = await runInstall(opts, io);
  } else {
    code = await runUninstall(opts, io);
  }
  process.exit(code);
}

async function main(): Promise<void> {
  await dispatchCli(process.argv, {
    install: (sub, argv) => runInstaller(sub, argv),
    // Run the inlined daemon in this process. `runDaemon` reads the pairing
    // token and extension id from the environment and binds the loopback port;
    // if another daemon already owns it, it exits 0 (success by proxy).
    serve: () => {
      runDaemon(process.env);
    },
    adapter: () => runAdapter({ name: NAME, version: VERSION }),
  });
}

main().catch((err: unknown) => {
  log(err instanceof Error ? (err.stack ?? err.message) : String(err));
  process.exit(1);
});
