/**
 * Points hosts that already run this connector through the package runner at
 * the installed copy instead. Only entries we registered are touched, no host
 * is added, and anything that cannot be confirmed is left as it is.
 */
import {
  buildEntryForHost,
  isOurEntry,
  isOurTomlTable,
  LEGACY_SERVER_NAMES,
  SERVER_NAME,
  type CliHost,
  type ServerEntryOptions,
} from "./hosts.js";
import { detectHosts } from "./run.js";
import type { HostResult, Io } from "./types.js";
import { upsertServerKey } from "./write-json.js";
import { tomlTableText, upsertTomlServer } from "./write-toml.js";

const RUNNER = /\bnpx(?:\.cmd)?\b/;

function runsThroughRunner(entry: unknown): boolean {
  if (!entry || typeof entry !== "object") return false;
  const { command, args } = entry as { command?: unknown; args?: unknown };
  const argv = [command, ...(Array.isArray(args) ? args : [])];
  return argv.some((part) => typeof part === "string" && RUNNER.test(part));
}

async function readJson(io: Io, path: string): Promise<unknown> {
  try {
    return JSON.parse(await io.readFile(path));
  } catch {
    return null;
  }
}

/** A runner entry under our key, or under a legacy key when it proves ours. */
function hasRunnerEntry(servers: Record<string, unknown> | undefined): boolean {
  if (servers === undefined) return false;
  if (runsThroughRunner(servers[SERVER_NAME])) return true;
  return LEGACY_SERVER_NAMES.some(
    (name) => isOurEntry(servers[name]) && runsThroughRunner(servers[name]),
  );
}

function hasRunnerTable(raw: string): boolean {
  const current = tomlTableText(raw, SERVER_NAME);
  if (current !== null && RUNNER.test(current)) return true;
  return LEGACY_SERVER_NAMES.some((name) => {
    const table = tomlTableText(raw, name);
    return table !== null && isOurTomlTable(table) && RUNNER.test(table);
  });
}

async function isRegistered(
  io: Io,
  cli: CliHost,
  getArgs: (name: string) => string[],
): Promise<boolean> {
  const shell = io.platform === "win32";
  for (const name of [SERVER_NAME, ...LEGACY_SERVER_NAMES]) {
    const got = await io.spawn(cli.bin, getArgs(name), { shell });
    if (got.code === 0) return true;
  }
  return false;
}

export async function relinkInstalledHosts(
  io: Io,
  opts: ServerEntryOptions,
): Promise<HostResult[]> {
  if (opts.launch === undefined) return [];
  const results: HostResult[] = [];
  const shell = io.platform === "win32";
  for (const d of await detectHosts(io)) {
    try {
      if (d.tier === 1 && d.cli?.buildGetArgs !== undefined) {
        const getArgs = d.cli.buildGetArgs.bind(d.cli);
        if (!(await isRegistered(io, d.cli, getArgs))) continue;
        for (const name of LEGACY_SERVER_NAMES) {
          await io.spawn(d.cli.bin, d.cli.buildRemoveArgs(name), { shell });
        }
        await io.spawn(d.cli.bin, d.cli.buildRemoveArgs(), { shell });
        const added = await io.spawn(d.cli.bin, d.cli.buildAddArgs(opts), {
          shell,
        });
        results.push({
          hostId: d.id,
          displayName: d.displayName,
          tier: 1,
          status: added.code === 0 ? "success" : "failed",
          message: added.code === 0 ? "relinked" : `exit ${added.code}`,
        });
      } else if (
        d.tier === 2 &&
        d.file?.entryKind === "stdio" &&
        d.configPath
      ) {
        const doc = (await readJson(io, d.configPath)) as {
          mcpServers?: Record<string, unknown>;
        } | null;
        if (!hasRunnerEntry(doc?.mcpServers)) continue;
        const outcome = await upsertServerKey(
          io,
          d.configPath,
          buildEntryForHost(d.file, opts, io.platform),
        );
        results.push({
          hostId: d.id,
          displayName: d.displayName,
          tier: 2,
          status: outcome.ok ? "success" : "failed",
          message: outcome.ok ? "relinked" : (outcome.reason ?? "failed"),
        });
      } else if (d.tier === 3 && d.snippet?.tomlServerName !== undefined) {
        const path = d.snippet.detectedPath(io);
        if (path === null || !(await io.exists(path))) continue;
        if (!hasRunnerTable(await io.readFile(path))) continue;
        const outcome = await upsertTomlServer(
          io,
          path,
          d.snippet.buildSnippet(opts, io.platform),
          d.snippet.tomlServerName,
        );
        results.push({
          hostId: d.id,
          displayName: d.displayName,
          tier: 3,
          status: outcome.ok ? "success" : "failed",
          message: outcome.ok ? "relinked" : (outcome.reason ?? "failed"),
        });
      }
    } catch {
      results.push({
        hostId: d.id,
        displayName: d.displayName,
        tier: d.tier,
        status: "failed",
        message: "error",
      });
    }
  }
  return results;
}
