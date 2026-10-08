/**
 * Points hosts that already run this connector through the package runner at
 * the installed copy instead. Only entries we registered are touched, no host
 * is added, and anything that cannot be confirmed is left as it is.
 */
import {
  buildEntryForHost,
  SERVER_NAME,
  type ServerEntryOptions,
} from "./hosts.js";
import { detectHosts } from "./run.js";
import type { HostResult, Io } from "./types.js";
import { upsertServerKey } from "./write-json.js";
import { upsertTomlServer } from "./write-toml.js";

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

/** The span of our own TOML table, up to the next table header. */
function ourTomlTable(raw: string): string | null {
  const start = raw.indexOf(`[mcp_servers.${SERVER_NAME}]`);
  if (start === -1) return null;
  const rest = raw.slice(start + 1);
  const next = rest.search(/^\[(?!mcp_servers\.datalab[.\]])/m);
  return next === -1 ? rest : rest.slice(0, next);
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
        const got = await io.spawn(d.cli.bin, d.cli.buildGetArgs(), { shell });
        if (got.code !== 0) continue;
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
        if (!runsThroughRunner(doc?.mcpServers?.[SERVER_NAME])) continue;
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
        const table = ourTomlTable(await io.readFile(path));
        if (table === null || !RUNNER.test(table)) continue;
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
