/**
 * Linux: the kernel's socket tables name the uid that owns each connection.
 * The peer's row is the one whose local end is the peer and whose remote end
 * is this daemon; a dual-stack client appears in the IPv6 table as mapped IPv4.
 */
import type { PeerEnds } from "./verdict.js";

export const PROC_TABLES = ["/proc/net/tcp", "/proc/net/tcp6"] as const;

const ESTABLISHED = "01";
const MAPPED_V6_PREFIX = "0000000000000000FFFF0000";

/** The kernel prints an IPv4 address as one little-endian word. */
function hexIpv4(address: string): string {
  return address
    .split(".")
    .reverse()
    .map((part) => Number(part).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function hexPort(port: number): string {
  return port.toString(16).padStart(4, "0").toUpperCase();
}

function endpoints(address: string, port: number): string[] {
  const v4 = hexIpv4(address);
  const hex = hexPort(port);
  return [`${v4}:${hex}`, `${MAPPED_V6_PREFIX}${v4}:${hex}`];
}

/** Uids of established rows from the peer to this daemon, across the given tables. */
export function procPeerUids(
  tables: readonly string[],
  ends: PeerEnds,
): number[] {
  const peer = endpoints(ends.peerAddress, ends.peerPort);
  const daemon = endpoints(ends.localAddress, ends.localPort);
  const uids: number[] = [];
  for (const table of tables) {
    for (const line of table.split("\n")) {
      const cols = line.trim().split(/\s+/u);
      if (cols.length < 8 || cols[3] !== ESTABLISHED) continue;
      const local = cols[1]?.toUpperCase() ?? "";
      const remote = cols[2]?.toUpperCase() ?? "";
      if (!peer.includes(local) || !daemon.includes(remote)) continue;
      const uid = Number(cols[7]);
      if (Number.isInteger(uid) && uid >= 0) uids.push(uid);
    }
  }
  return uids;
}
