/**
 * Which OS account owns the program listening on the connector port. Measured
 * from the system's socket tables, never from what the listener says about
 * itself, so a program of another account cannot answer for our daemon.
 */

export type ListenerMeasure =
  | { readonly kind: "own"; readonly key: string }
  | { readonly kind: "other" }
  | { readonly kind: "unknown" };

export interface RunOutput {
  readonly code: number;
  readonly stdout: string;
}

export interface MeasureDeps {
  readonly platform: NodeJS.Platform;
  readonly uid: number | undefined;
  /** Null when the file cannot be read. */
  readFile(path: string): Promise<string | null>;
  /** Null when the command could not be started at all. */
  run(command: string, args: readonly string[]): Promise<RunOutput | null>;
  /** True when something accepts a TCP connection on the port. */
  portOpen(port: number): Promise<boolean>;
}

const LISTEN_STATE = "0A";
/** Addresses a connection to 127.0.0.1 can land on: loopback itself and the wildcard. */
const V4_REACHABLE = new Set(["0100007F", "00000000"]);
// The table cannot tell a v6only [::] listener, so [::] counts; such a listener
// can only make this adapter refuse, never receive a call.
const V6_REACHABLE = new Set([
  "0000000000000000FFFF00000100007F",
  "00000000000000000000000000000000",
]);

export interface ProcListener {
  readonly uid: number;
  readonly inode: string;
}

/** LISTEN rows on the port from /proc/net/tcp or tcp6; client sockets never match. */
export function procListeners(
  table: string,
  port: number,
  v6: boolean,
): ProcListener[] {
  const portHex = port.toString(16).toUpperCase().padStart(4, "0");
  const reachable = v6 ? V6_REACHABLE : V4_REACHABLE;
  const rows: ProcListener[] = [];
  for (const line of table.split("\n").slice(1)) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 10 || cols[3] !== LISTEN_STATE) continue;
    const [address, hex] = (cols[1] ?? "").split(":");
    if (hex?.toUpperCase() !== portHex) continue;
    if (!reachable.has((address ?? "").toUpperCase())) continue;
    const uid = Number(cols[7]);
    if (!Number.isInteger(uid)) continue;
    rows.push({ uid, inode: cols[9] ?? "" });
  }
  return rows;
}

/** Pids from lsof -Fpn whose name is the port on loopback or the wildcard. */
export function lsofListenerPids(output: string, port: number): number[] {
  const names = new Set([
    `127.0.0.1:${String(port)}`,
    `*:${String(port)}`,
    `[::ffff:127.0.0.1]:${String(port)}`,
  ]);
  const pids = new Set<number>();
  let pid = 0;
  for (const line of output.split(/\r?\n/)) {
    if (line.startsWith("p")) {
      pid = Number(line.slice(1));
      continue;
    }
    if (line.startsWith("n") && names.has(line.slice(1))) {
      if (Number.isInteger(pid) && pid > 0) pids.add(pid);
    }
  }
  return [...pids].sort((a, b) => a - b);
}

async function measureLinux(
  port: number,
  uid: number,
  deps: MeasureDeps,
): Promise<ListenerMeasure> {
  const v4 = await deps.readFile("/proc/net/tcp");
  const v6 = await deps.readFile("/proc/net/tcp6");
  if (v4 === null && v6 === null) return { kind: "unknown" };
  const rows = [
    ...procListeners(v4 ?? "", port, false),
    ...procListeners(v6 ?? "", port, true),
  ];
  if (rows.length === 0) return { kind: "unknown" };
  if (rows.some((row) => row.uid !== uid)) return { kind: "other" };
  const inodes = rows.map((row) => row.inode).sort();
  return { kind: "own", key: `linux:${inodes.join(",")}` };
}

async function measureDarwin(
  port: number,
  uid: number,
  deps: MeasureDeps,
): Promise<ListenerMeasure> {
  const listing = await deps.run("lsof", [
    "-nP",
    `-iTCP:${String(port)}`,
    "-sTCP:LISTEN",
    "-Fpn",
  ]);
  // lsof answers 1 when it matched nothing; anything else is not a listing.
  if (listing === null || (listing.code !== 0 && listing.code !== 1)) {
    return { kind: "unknown" };
  }
  const pids = lsofListenerPids(listing.stdout, port);
  if (pids.length === 0) {
    // lsof lists only this user's sockets here, so a port that answers with no
    // listener of ours is held by another account.
    if (await deps.portOpen(port)) return { kind: "other" };
    return { kind: "unknown" };
  }
  for (const pid of pids) {
    const owner = await deps.run("ps", ["-o", "uid=", "-p", String(pid)]);
    const ownerUid = Number(owner?.stdout.trim());
    if (owner === null || owner.code !== 0 || !Number.isInteger(ownerUid)) {
      return { kind: "unknown" };
    }
    if (ownerUid !== uid) return { kind: "other" };
  }
  return { kind: "own", key: `darwin:${pids.join(",")}` };
}

/** Unknown never refuses: Windows and any unreadable table proceed as before. */
export async function measureListener(
  port: number,
  deps: MeasureDeps,
): Promise<ListenerMeasure> {
  if (deps.uid === undefined) return { kind: "unknown" };
  if (deps.platform === "linux") return measureLinux(port, deps.uid, deps);
  if (deps.platform === "darwin") return measureDarwin(port, deps.uid, deps);
  return { kind: "unknown" };
}
