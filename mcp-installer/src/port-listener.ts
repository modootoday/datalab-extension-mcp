/**
 * Ends whatever listens on the connector port without a shell or a script
 * host: the listener list comes from netstat or lsof run directly, and the
 * ids are ended one by one. The connector's daemon carries the same three
 * functions; a parity test keeps the copies identical.
 */

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

/** True when at least one listener other than `selfPid` was signalled. */
export async function endPortListener(
  platform: string,
  port: number,
  deps: {
    capture: (command: string, args: string[]) => Promise<string>;
    killPid: (pid: number) => void;
    selfPid: number;
  },
): Promise<boolean> {
  const query = listenerQuery(platform, port);
  if (query === null) return false;
  const output = await deps.capture(query.command, query.args);
  const pids =
    platform === "win32"
      ? parseNetstatListeners(output, port)
      : parseLsofPids(output);
  let signalled = false;
  for (const pid of pids) {
    if (pid === deps.selfPid) continue;
    try {
      deps.killPid(pid);
      signalled = true;
    } catch {
      // Already gone, or not ours to end; the caller probes the port again.
    }
  }
  return signalled;
}
