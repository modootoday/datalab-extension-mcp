/**
 * Ending whatever holds the connector's port.
 *
 * The last resort behind the token and the takeover file. Reached only after
 * `/bridge/health` has already identified the holder as our connector, so this
 * never points at a stranger's process. No shell and no script host run: the
 * listener list comes from netstat or lsof run directly, and Node ends the ids.
 */
import { spawnSync } from "node:child_process";

/** Process ids listening on `port`, from `netstat -ano -p TCP` output. */
export function parseNetstatListeners(output: string, port: number): number[] {
  const pids = new Set<number>();
  for (const line of output.split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 5 || cols[0]?.toUpperCase() !== "TCP") continue;
    if (cols[3]?.toUpperCase() !== "LISTENING") continue;
    const local = cols[1] ?? "";
    if (local.slice(local.lastIndexOf(":") + 1) !== String(port)) continue;
    const pid = Number(cols[4]);
    if (Number.isInteger(pid) && pid > 0) pids.add(pid);
  }
  return [...pids];
}

/** Process ids from `lsof -ti` output, one per line. */
export function parseLsofPids(output: string): number[] {
  return output
    .split(/\r?\n/)
    .map((l) => Number(l.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

/** The listing to run, or null on a platform we have no reliable one for. */
export function listenerQuery(
  platform: string,
  port: number,
): { command: string; args: string[] } | null {
  if (platform === "win32") {
    return { command: "netstat", args: ["-ano", "-p", "TCP"] };
  }
  if (platform === "darwin" || platform === "linux") {
    return { command: "lsof", args: ["-ti", `tcp:${port}`, "-sTCP:LISTEN"] };
  }
  return null;
}

/** Ids listening on `port`, never this process. */
export function listenerPids(
  platform: string,
  port: number,
  run: (command: string, args: string[]) => string,
  selfPid: number,
): number[] {
  const query = listenerQuery(platform, port);
  if (query === null) return [];
  const output = run(query.command, query.args);
  const pids =
    platform === "win32"
      ? parseNetstatListeners(output, port)
      : parseLsofPids(output);
  return pids.filter((pid) => pid !== selfPid);
}

function runQuiet(command: string, args: string[]): string {
  const res = spawnSync(command, args, {
    encoding: "utf8",
    windowsHide: true,
    timeout: 10_000,
  });
  return typeof res.stdout === "string" ? res.stdout : "";
}

/**
 * Run it. Returns whether a listener was signalled — not whether the port is
 * free, which only a probe can answer.
 */
export function killPortOwner(
  port: number,
  platform: string = process.platform,
): boolean {
  // Under a test runner this would end the connector the developer is running,
  // on their own machine, from a suite that only meant to assert a code path.
  // Callers inject their own for this; the interlock is for the ones that
  // forget, and it costs no coverage — the parsing is asserted directly.
  if (process.env["VITEST"] !== undefined) return false;
  let signalled = false;
  for (const pid of listenerPids(platform, port, runQuiet, process.pid)) {
    try {
      process.kill(pid, "SIGKILL");
      signalled = true;
    } catch {
      // Already gone; the caller probes the port again either way.
    }
  }
  return signalled;
}
