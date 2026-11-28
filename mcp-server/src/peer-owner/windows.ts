/**
 * Windows, with no script host: netstat names the process behind the peer's
 * end, and tasklist names that process's account as DOMAIN\user. A process of
 * another account reads N/A unless elevated, which counts as unknown.
 */
import type { PeerEnds } from "./verdict.js";

export const NETSTAT_ARGS = ["-ano", "-p", "TCP"] as const;

export function tasklistArgs(pid: number): string[] {
  return ["/v", "/fo", "csv", "/nh", "/fi", `PID eq ${String(pid)}`];
}

/** Processes holding the peer's end of the connection to this daemon. */
export function netstatPeerPids(output: string, ends: PeerEnds): number[] {
  const local = `${ends.peerAddress}:${String(ends.peerPort)}`;
  const foreign = `${ends.localAddress}:${String(ends.localPort)}`;
  const pids = new Set<number>();
  for (const line of output.split(/\r?\n/u)) {
    const cols = line.trim().split(/\s+/u);
    if (cols.length < 5 || cols[0]?.toUpperCase() !== "TCP") continue;
    if (cols[1] !== local || cols[2] !== foreign) continue;
    const pid = Number(cols[cols.length - 1]);
    if (Number.isInteger(pid) && pid > 0) pids.add(pid);
  }
  return [...pids];
}

function csvFields(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line.charAt(i);
    if (quoted && ch === '"' && line.charAt(i + 1) === '"') {
      field += '"';
      i += 1;
      continue;
    }
    if (ch === '"') {
      quoted = !quoted;
      continue;
    }
    if (ch === "," && !quoted) {
      fields.push(field);
      field = "";
      continue;
    }
    field += ch;
  }
  fields.push(field);
  return fields;
}

const USER_COLUMN = 6;

/** The DOMAIN\user that tasklist names for pid, or null when it names none. */
export function tasklistAccount(output: string, pid: number): string | null {
  for (const line of output.split(/\r?\n/u)) {
    const fields = csvFields(line.trim());
    if (Number(fields[1]) !== pid) continue;
    const account = fields[USER_COLUMN]?.trim() ?? "";
    if (!account.includes("\\")) return null;
    return account.toLowerCase();
  }
  return null;
}
