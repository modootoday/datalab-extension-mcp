/**
 * Finds the OS account behind a loopback peer, once per accepted socket: the
 * keep-alive requests and streams that reuse a socket share its verdict. Only
 * port numbers read from our own socket reach a command, as arguments.
 */
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import type { Socket } from "node:net";

import { lsofArgs, lsofPeerRecords } from "./darwin.js";
import { PROC_TABLES, procPeerUids } from "./linux.js";
import {
  peerEnds,
  type PeerEnds,
  type PeerOwnerCheck,
  type PeerVerdict,
} from "./verdict.js";
import {
  NETSTAT_ARGS,
  netstatPeerPids,
  tasklistAccount,
  tasklistArgs,
} from "./windows.js";

export interface RunResult {
  readonly code: number;
  readonly stdout: string;
}

export interface PeerOwnerDeps {
  readonly platform: NodeJS.Platform;
  readonly selfPid: number;
  readonly selfUid: number | null;
  readFile(path: string): Promise<string>;
  run(command: string, args: readonly string[]): Promise<RunResult>;
  /** Injected in tests; the clock behind the Windows account cache. */
  now?: () => number;
}

/** tasklist /v is slow, so a refused peer pid's account is kept briefly. */
export const WINDOWS_ACCOUNT_TTL_MS = 10_000;

const RUN_TIMEOUT_MS = 5_000;
const RUN_MAX_BUFFER = 8 * 1024 * 1024;

function runCommand(
  command: string,
  args: readonly string[],
): Promise<RunResult> {
  return new Promise((resolve) => {
    // latin1 keeps a non-ASCII account name byte-stable, so the peer's and our
    // own compare equal whatever code page the console uses.
    execFile(
      command,
      [...args],
      {
        encoding: "latin1",
        timeout: RUN_TIMEOUT_MS,
        maxBuffer: RUN_MAX_BUFFER,
        windowsHide: true,
      },
      (error, stdout) => {
        if (error === null) {
          resolve({ code: 0, stdout });
          return;
        }
        const code = typeof error.code === "number" ? error.code : -1;
        resolve({ code, stdout: stdout ?? "" });
      },
    );
  });
}

export function systemPeerOwnerDeps(): PeerOwnerDeps {
  return {
    platform: process.platform,
    selfPid: process.pid,
    selfUid: typeof process.getuid === "function" ? process.getuid() : null,
    readFile: (path) => readFile(path, "utf8"),
    run: runCommand,
  };
}

function byUid(uids: readonly number[], selfUid: number | null): PeerVerdict {
  if (selfUid === null) return { kind: "unknown", cause: "no own uid" };
  if (uids.length !== 1) {
    return {
      kind: "unknown",
      cause: `${String(uids.length)} matching connections`,
    };
  }
  return uids[0] === selfUid ? { kind: "own" } : { kind: "other" };
}

async function linuxVerdict(
  deps: PeerOwnerDeps,
  ends: PeerEnds,
): Promise<PeerVerdict> {
  const tables: string[] = [];
  for (const path of PROC_TABLES) {
    try {
      tables.push(await deps.readFile(path));
    } catch {
      // A kernel without IPv6 has no tcp6 table; the IPv4 table still answers.
    }
  }
  if (tables.length === 0) return { kind: "unknown", cause: "proc unreadable" };
  return byUid(procPeerUids(tables, ends), deps.selfUid);
}

async function darwinVerdict(
  deps: PeerOwnerDeps,
  ends: PeerEnds,
): Promise<PeerVerdict> {
  const out = await deps.run("lsof", lsofArgs(ends));
  if (out.stdout.length === 0)
    return { kind: "unknown", cause: `lsof exit ${String(out.code)}` };
  const records = lsofPeerRecords(out.stdout, ends);
  return byUid(
    records.map((record) => record.uid),
    deps.selfUid,
  );
}

async function windowsAccount(
  deps: PeerOwnerDeps,
  pid: number,
): Promise<string | null> {
  const out = await deps.run("tasklist", tasklistArgs(pid));
  return tasklistAccount(out.stdout, pid);
}

async function windowsVerdict(
  deps: PeerOwnerDeps,
  ends: PeerEnds,
  ownAccount: () => Promise<string | null>,
  peerAccount: (pid: number) => Promise<string | null>,
): Promise<PeerVerdict> {
  const out = await deps.run("netstat", NETSTAT_ARGS);
  const pids = netstatPeerPids(out.stdout, ends);
  if (pids.length !== 1) {
    return {
      kind: "unknown",
      cause: `${String(pids.length)} matching connections`,
    };
  }
  const own = await ownAccount();
  if (own === null) return { kind: "unknown", cause: "no own account" };
  const peer = await peerAccount(pids[0] ?? 0);
  if (peer === null)
    return { kind: "unknown", cause: "peer account unreadable" };
  return peer === own ? { kind: "own" } : { kind: "other" };
}

export function createPeerOwnerCheck(
  deps: PeerOwnerDeps = systemPeerOwnerDeps(),
): PeerOwnerCheck {
  const verdicts = new WeakMap<Socket, Promise<PeerVerdict>>();
  let ownAccount: Promise<string | null> | null = null;
  const own = (): Promise<string | null> => {
    ownAccount ??= windowsAccount(deps, deps.selfPid);
    return ownAccount;
  };
  const now = deps.now ?? Date.now;
  const accounts = new Map<
    number,
    { at: number; account: Promise<string | null> }
  >();
  const peerAccount = (pid: number): Promise<string | null> => {
    const at = now();
    const kept = accounts.get(pid);
    if (kept !== undefined && at - kept.at < WINDOWS_ACCOUNT_TTL_MS) {
      return kept.account;
    }
    for (const [key, entry] of accounts) {
      if (at - entry.at >= WINDOWS_ACCOUNT_TTL_MS) accounts.delete(key);
    }
    const account = windowsAccount(deps, pid);
    const entry = { at, account };
    accounts.set(pid, entry);
    // Only refusing answers are kept: a recycled pid must never inherit an own one.
    void Promise.all([account, own()])
      .then(([peer, self]) => {
        if (peer !== null && peer === self && accounts.get(pid) === entry) {
          accounts.delete(pid);
        }
      })
      .catch(() => {
        if (accounts.get(pid) === entry) accounts.delete(pid);
      });
    return account;
  };

  const decide = async (socket: Socket): Promise<PeerVerdict> => {
    const ends = peerEnds(socket);
    if (ends === null)
      return { kind: "unknown", cause: "not a loopback IPv4 peer" };
    try {
      if (deps.platform === "linux") return await linuxVerdict(deps, ends);
      if (deps.platform === "darwin") return await darwinVerdict(deps, ends);
      if (deps.platform === "win32")
        return await windowsVerdict(deps, ends, own, peerAccount);
    } catch (error) {
      return {
        kind: "unknown",
        cause: error instanceof Error ? error.message : "lookup failed",
      };
    }
    return { kind: "unknown", cause: `no lookup on ${deps.platform}` };
  };

  return (socket) => {
    const cached = verdicts.get(socket);
    if (cached !== undefined) return cached;
    const verdict = decide(socket);
    verdicts.set(socket, verdict);
    return verdict;
  };
}
