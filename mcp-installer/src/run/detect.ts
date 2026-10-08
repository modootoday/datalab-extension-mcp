/**
 * Which known programs are on this machine. CLIs are probed by running them;
 * file hosts count as present when the config file or its parent app
 * directory exists, since a fresh install often has the directory and no config.
 */
import {
  CLI_HOSTS,
  FILE_HOSTS,
  SNIPPET_HOSTS,
  type CliHost,
  type FileHost,
  type SnippetHost,
} from "../hosts.js";
import type { Io } from "../types.js";

export interface DetectedHost {
  tier: 1 | 2 | 3;
  id: string;
  displayName: string;
  cli?: CliHost;
  file?: FileHost;
  snippet?: SnippetHost;
  /** Resolved config path for Tier-2 hosts. */
  configPath?: string;
}

export async function detectHosts(io: Io): Promise<DetectedHost[]> {
  const detected: DetectedHost[] = [];
  const cliDetected = new Set<string>();

  for (const host of CLI_HOSTS) {
    if (!(await cliResponds(io, host))) continue;
    cliDetected.add(host.id);
    detected.push({
      tier: 1,
      id: host.id,
      displayName: host.displayName,
      cli: host,
    });
  }

  for (const host of FILE_HOSTS) {
    const configPath = await presentConfigPath(io, host);
    if (configPath === null) continue;
    detected.push({
      tier: 2,
      id: host.id,
      displayName: host.displayName,
      file: host,
      configPath,
    });
  }

  for (const host of SNIPPET_HOSTS) {
    if (!(await snippetPresent(io, host, cliDetected))) continue;
    detected.push({
      tier: 3,
      id: host.id,
      displayName: host.displayName,
      snippet: host,
    });
  }

  return detected;
}

export function filterByRequestedHosts(
  detected: DetectedHost[],
  hosts: string[] | undefined,
): DetectedHost[] {
  if (hosts === undefined || hosts.length === 0) return detected;
  return detected.filter((d) => hosts.includes(d.id));
}

async function cliResponds(io: Io, host: CliHost): Promise<boolean> {
  try {
    const result = await io.spawn(host.bin, ["--version"], {
      shell: io.platform === "win32",
    });
    return result.code === 0;
  } catch {
    return false;
  }
}

/**
 * A path that must be resolved against the filesystem wins: a Store install
 * redirects app data into its package container, so writing to the plain
 * location reports success the app never sees.
 */
async function presentConfigPath(
  io: Io,
  host: FileHost,
): Promise<string | null> {
  let configPath: string | null = null;
  if (host.resolveConfigPath !== undefined) {
    try {
      configPath = await host.resolveConfigPath(io);
    } catch {
      configPath = null;
    }
  }
  configPath ??= host.configPath(io);
  if (configPath === null) return null;
  if (await io.exists(configPath)) return configPath;
  const cut = Math.max(
    configPath.lastIndexOf("/"),
    configPath.lastIndexOf("\\"),
  );
  if (cut > 0 && (await io.exists(configPath.slice(0, cut)))) {
    return configPath;
  }
  return null;
}

async function snippetPresent(
  io: Io,
  host: SnippetHost,
  cliDetected: Set<string>,
): Promise<boolean> {
  try {
    return await host.detect(io, { cliDetected });
  } catch {
    return false;
  }
}
