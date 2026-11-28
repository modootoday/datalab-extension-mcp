import type { Socket } from "node:net";

/** Whose program is at the other end of a loopback connection. */
export type PeerVerdict =
  | { kind: "own" }
  | { kind: "other" }
  | { kind: "unknown"; cause: string };

/** The four numbers that name one loopback connection, read from our own socket. */
export interface PeerEnds {
  readonly peerAddress: string;
  readonly peerPort: number;
  readonly localAddress: string;
  readonly localPort: number;
}

export type PeerOwnerCheck = (socket: Socket) => Promise<PeerVerdict>;

const MAPPED_PREFIX = "::ffff:";

function plainIpv4(address: string | undefined): string | null {
  if (address === undefined) return null;
  const bare = address.toLowerCase().startsWith(MAPPED_PREFIX)
    ? address.slice(MAPPED_PREFIX.length)
    : address;
  return /^\d{1,3}(\.\d{1,3}){3}$/u.test(bare) ? bare : null;
}

/** Null when either end is not an IPv4 loopback address we can look up. */
export function peerEnds(socket: Socket): PeerEnds | null {
  const peerAddress = plainIpv4(socket.remoteAddress);
  const localAddress = plainIpv4(socket.localAddress);
  const peerPort = socket.remotePort;
  const localPort = socket.localPort;
  if (peerAddress === null || localAddress === null) return null;
  if (!peerAddress.startsWith("127.") || !localAddress.startsWith("127.")) {
    return null;
  }
  if (peerPort === undefined || localPort === undefined) return null;
  return { peerAddress, peerPort, localAddress, localPort };
}
