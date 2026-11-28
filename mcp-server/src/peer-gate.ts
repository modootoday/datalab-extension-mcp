/**
 * Serves only programs of the account that runs the daemon. The verdict is
 * found before any byte of a request is read; only the health route skips it.
 */
import type { IncomingMessage, ServerResponse } from "node:http";

import { json } from "./http-io.js";
import type { PeerOwnerCheck, PeerVerdict } from "./peer-owner/index.js";

export const PEER_OPEN_PATH = "/bridge/health";

const HELLO_PATH = "/bridge/hello";

const MESSAGES = {
  forbidden_peer:
    "This connection comes from a program of another account on this computer.",
  peer_unverified:
    "The connector could not confirm that this connection comes from a program of this account.",
} as const;

function pathnameOf(req: IncomingMessage): string {
  return new URL(req.url ?? "/", "http://127.0.0.1").pathname;
}

function refuse(
  req: IncomingMessage,
  res: ServerResponse,
  verdict: Exclude<PeerVerdict, { kind: "own" }>,
  log: ((message: string) => void) | undefined,
): void {
  req.resume();
  const reason =
    verdict.kind === "other" ? "forbidden_peer" : "peer_unverified";
  if (verdict.kind === "other") {
    log?.("refused a request: peer belongs to another account");
  } else {
    log?.(`refused a request: peer account not confirmed (${verdict.cause})`);
  }
  if (pathnameOf(req) === HELLO_PATH) {
    json(res, 403, {
      t: "hello_nack",
      reason,
      supported: [],
      message: MESSAGES[reason],
    });
    return;
  }
  json(res, 403, { error: reason });
}

export function gatePeer(
  check: PeerOwnerCheck,
  handle: (req: IncomingMessage, res: ServerResponse) => void,
  log?: (message: string) => void,
): (req: IncomingMessage, res: ServerResponse) => void {
  return (req, res) => {
    if (pathnameOf(req) === PEER_OPEN_PATH) {
      handle(req, res);
      return;
    }
    void check(req.socket).then((verdict) => {
      if (verdict.kind === "own") {
        handle(req, res);
        return;
      }
      refuse(req, res, verdict, log);
    });
  };
}
