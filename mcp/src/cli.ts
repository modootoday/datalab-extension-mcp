#!/usr/bin/env node
/**
 * The bin an MCP host spawns. Four roles: the thin stdio adapter by default,
 * a serve subcommand that runs the inlined daemon in this process (what the
 * adapter spawns), install and uninstall for the host installer, and skills
 * for what we ship.
 *
 * Only argv routing and process wiring — everything with logic lives in a
 * testable module, which is why this file sits outside the coverage gate.
 */
import { createRequire } from "node:module";

import { runDaemon } from "@modootoday/extension-app-mcp-server";

import { dispatchCli, runAdapter } from "./adapter.js";

const NAME = "datalab-extension-mcp";

/**
 * The version we report, read from the manifest so it cannot drift from what
 * shipped — a drift here breaks nothing loudly and only shows up as a debug
 * session chasing the wrong build. The relative path resolves both from source
 * and from the published tarball; a build-time constant would not, because the
 * mirror generates its own build config.
 */
const VERSION = (
  createRequire(import.meta.url)("../package.json") as { version: string }
).version;

/**
 * Anything printed must go to stderr. stdout is the MCP transport, so a
 * stray write there is a protocol frame to the host and corrupts the session.
 */
function log(message: string): void {
  process.stderr.write(`[${NAME}] ${message}\n`);
}

/**
 * The install helper. Same bin on purpose, so it always runs at exactly the
 * version it writes into host configs. Loaded lazily so the adapter path never
 * pays for it.
 */
async function runInstaller(
  sub: "install" | "uninstall",
  argv: readonly string[],
): Promise<never> {
  const { createNodeIo, runInstall, runUninstall } =
    await import("@modootoday/extension-app-mcp-installer");

  // The installer's own type, not a copy of it — a hand-kept duplicate had
  // already drifted, and the flag parser is the one place a missing option is
  // invisible until someone types it.
  type Opts = Parameters<typeof runInstall>[0];
  const opts: { -readonly [K in keyof Opts]: Opts[K] } = { version: VERSION };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--token") opts.token = argv[(i += 1)];
    else if (flag === "--extension-id") opts.extensionId = argv[(i += 1)];
    else if (flag === "--port") opts.port = argv[(i += 1)];
    else if (flag === "--yes" || flag === "-y") opts.yes = true;
    // Skills ride the same run by default — the payload is already on disk.
    else if (flag === "--no-skills") opts.skills = false;
    else if (flag === "--skills") opts.skills = true;
    // Everything, including the three that need an editor open.
    else if (flag === "--all-skills") opts.allSkills = true;
    else if (flag === "--host") {
      opts.hosts = opts.hosts ?? [];
      const host = argv[(i += 1)];
      if (host) opts.hosts.push(host);
    }
    // Unknown flags are ignored rather than fatal: a future panel may emit a
    // flag this pinned helper predates, and refusing would strand the user.
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
    // Run the inlined daemon in this process. It reads the pairing token and
    // extension id from the environment and binds the loopback port; if another
    // daemon already owns it, it exits 0 — the daemon wanted already exists.
    serve: () => {
      runDaemon(process.env);
    },
    adapter: () =>
      runAdapter({
        name: NAME,
        version: VERSION,
        // The host config pins an exact version, so without this a paired user
        // never receives a release. `--no-self-update` keeps this build.
        selfUpdate: !process.argv.slice(2).includes("--no-self-update"),
      }),
    // Loaded lazily, like the installer: an MCP host spawning the adapter must
    // not pay to resolve a command only an operator types.
    skills: async (argv) => {
      const { runSkills } = await import("./skills.js");
      const {
        createNodeIo,
        listSkills,
        skillStatus,
        attachSkill,
        detachSkill,
        skillsPayloadRoot,
      } = await import("@modootoday/extension-app-mcp-installer");
      const io = createNodeIo();
      const root = skillsPayloadRoot();
      const code = await runSkills(argv, {
        out: (line) => process.stdout.write(`${line}\n`),
        list: () => listSkills(io, root),
        status: () => skillStatus(io, root),
        // The marker records the version that placed it, so this must be the
        // build doing the placing — not whatever the host config once pinned.
        attach: (slug) => attachSkill(io, root, slug, VERSION),
        detach: (slug) => detachSkill(io, root, slug),
      });
      process.exit(code);
    },
    // Said out loud and refused. Left to fall through, a typo would speak
    // the MCP protocol at the terminal — nothing on screen, since diagnostics
    // go to stderr — and start a connector on the way.
    unknown: (sub) => {
      log(`unknown command "${sub}".`);
      log(`usage: ${NAME} [install|uninstall|serve|skills]`);
      log(`  skills [list|status|attach <slug>|detach <slug>]`);
      log(`run with no command to serve an MCP host over stdio.`);
      process.exit(2);
    },
  });
}

/**
 * Fail loudly, but let the loop unwind first.
 *
 * A startup fault throws while the probe socket and the fetch that diagnosed it
 * are still tearing down, and `process.exit` from there cuts libuv off
 * mid-close — on Windows that surfaces as an `async.c` assertion, which buries
 * the message the operator actually needs under a crash. Setting the code lets
 * the handles finish; the timer is the backstop for anything that would
 * otherwise keep the process alive, and is unref'd so it never does itself.
 */
main().catch((err: unknown) => {
  log(err instanceof Error ? (err.stack ?? err.message) : String(err));
  process.exitCode = 1;
  const bail = setTimeout(() => process.exit(1), 2_000);
  bail.unref?.();
});
