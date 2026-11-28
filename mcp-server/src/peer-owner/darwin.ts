/**
 * macOS: lsof lists both ends of the connection, this daemon's socket among
 * them, so only the record whose name runs from the peer to the daemon counts.
 * Exactly one such record is required.
 */
import type { PeerEnds } from "./verdict.js";

export function lsofArgs(ends: PeerEnds): string[] {
  return ["-nP", `-iTCP@${ends.peerAddress}:${String(ends.peerPort)}`, "-Fpun"];
}

interface LsofRecord {
  readonly pid: number;
  readonly uid: number;
}

/** Records naming the connection from the peer to this daemon; the reverse name is ours. */
export function lsofPeerRecords(output: string, ends: PeerEnds): LsofRecord[] {
  const name = `${ends.peerAddress}:${String(ends.peerPort)}->${ends.localAddress}:${String(ends.localPort)}`;
  const records: LsofRecord[] = [];
  let pid = -1;
  let uid = -1;
  for (const line of output.split(/\r?\n/u)) {
    const tag = line.charAt(0);
    const value = line.slice(1);
    if (tag === "p") {
      pid = Number(value);
      uid = -1;
      continue;
    }
    if (tag === "u") {
      uid = Number(value);
      continue;
    }
    if (tag !== "n" || value !== name) continue;
    if (!Number.isInteger(pid) || pid <= 0) continue;
    if (!Number.isInteger(uid) || uid < 0) continue;
    records.push({ pid, uid });
  }
  return records;
}
