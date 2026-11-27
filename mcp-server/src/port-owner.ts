/**
 * Ending the connector that holds its port, and nothing else.
 *
 * The last resort behind the token and the takeover file. A process is ended
 * only when it is the one listener on 127.0.0.1 at that port, reports that pid
 * itself, runs our bin and belongs to this user. No shell or script host runs.
 */
import { spawnSync } from "node:child_process";

/** Ids listening on exactly 127.0.0.1:`port`, from `netstat -ano -p TCP`. */
export function parseNetstatListeners(output: string, port: number): number[] {
  const pids = new Set<number>();
  for (const line of output.split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 5 || cols[0]?.toUpperCase() !== "TCP") continue;
    if (cols[3]?.toUpperCase() !== "LISTENING") continue;
    if (cols[1] !== `127.0.0.1:${String(port)}`) continue;
    const pid = Number(cols[4]);
    if (Number.isInteger(pid) && pid > 0) pids.add(pid);
  }
  return [...pids];
}

/** Ids listening on exactly 127.0.0.1:`port`, from `lsof -Fpn` output. */
export function parseLsofListeners(output: string, port: number): number[] {
  const pids = new Set<number>();
  let pid = 0;
  for (const line of output.split(/\r?\n/)) {
    if (line.startsWith("p")) {
      pid = Number(line.slice(1));
      continue;
    }
    if (!line.startsWith("n")) continue;
    if (line.slice(1) !== `127.0.0.1:${String(port)}`) continue;
    if (Number.isInteger(pid) && pid > 0) pids.add(pid);
  }
  return [...pids];
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
    return {
      command: "lsof",
      args: ["-nP", `-iTCP:${String(port)}`, "-sTCP:LISTEN", "-Fpn"],
    };
  }
  return null;
}

/** The owner and command line of `pid`, or null where none can be read without a script host. */
export function identityQuery(
  platform: string,
  pid: number,
): { command: string; args: string[] } | null {
  if (platform === "darwin" || platform === "linux") {
    return { command: "ps", args: ["-o", "uid=,command=", "-p", String(pid)] };
  }
  return null;
}

/** True when `ps -o uid=,command=` output is our bin, run by `uid`. */
export function isOwnConnector(output: string, uid: number): boolean {
  const match = /^\s*(\d+)\s+(.+)$/.exec(output.trim());
  if (match === null) return false;
  if (Number(match[1]) !== uid) return false;
  return (match[2] ?? "").includes("datalab-extension-mcp");
}

/** The single listener other than `selfPid`, or null when there is none or several. */
export function soleListener(pids: number[], selfPid: number): number | null {
  const others = pids.filter((pid) => pid !== selfPid);
  if (others.length !== 1) return null;
  return others[0] ?? null;
}

function runQuiet(command: string, args: string[]): string {
  const res = spawnSync(command, args, {
    encoding: "utf8",
    windowsHide: true,
    timeout: 10_000,
  });
  return typeof res.stdout === "string" ? res.stdout : "";
}

/** The pid that is provably our connector on the port, or null. */
export function ownListener(
  platform: string,
  port: number,
  reportedPid: number | null,
  run: (command: string, args: string[]) => string,
  selfPid: number,
  uid: number | undefined,
): number | null {
  if (reportedPid === null || uid === undefined) return null;
  const query = listenerQuery(platform, port);
  if (query === null) return null;
  const listing = run(query.command, query.args);
  const pids =
    platform === "win32"
      ? parseNetstatListeners(listing, port)
      : parseLsofListeners(listing, port);
  const pid = soleListener(pids, selfPid);
  if (pid === null || pid !== reportedPid) return null;
  const identity = identityQuery(platform, pid);
  if (identity === null) return null;
  return isOwnConnector(run(identity.command, identity.args), uid) ? pid : null;
}

/**
 * Run it. Returns whether the listener was proven ours and signalled — not
 * whether the port is free, which only a probe can answer.
 */
export function killPortOwner(
  port: number,
  reportedPid: number | null,
  platform: string = process.platform,
): boolean {
  // Under a test runner this would end the connector the developer is running,
  // on their own machine, from a suite that only meant to assert a code path.
  if (process.env["VITEST"] !== undefined) return false;
  const pid = ownListener(
    platform,
    port,
    reportedPid,
    runQuiet,
    process.pid,
    process.getuid?.(),
  );
  if (pid === null) return false;
  try {
    process.kill(pid, "SIGKILL");
    return true;
  } catch {
    return false;
  }
}
