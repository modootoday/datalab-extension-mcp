/**
 * Clearing the port at install time.
 *
 * A connector keeps the workbench token it was started with, and refuses every
 * caller holding another one — including the browser that would register, and
 * the request that would ask it to stand down. It idles out only at zero
 * connections, which any running AI app prevents. So a machine whose token has
 * moved on stays wedged, and no screen in the browser can move it.
 *
 * Install is where that gets fixed, because install is the one moment the user
 * has already granted a local shell: it can end a process, which is strictly
 * more than the token gate protects against. Asking politely first is still
 * right, and a stranger on the port is never touched.
 */
import { joinPath } from "./hosts/paths.js";
import {
  endPortListener,
  type ListenerDeps,
  ownListener,
} from "./port-listener.js";
import type { Io } from "./types.js";

/** Where the connector listens, and how it identifies itself there. */
const DEFAULT_PORT = 8765;
const HOST = "127.0.0.1";
const CONNECTOR_NAME = "datalab-extension-mcp-server";
/** Where a running connector leaves its takeover secret, readable only by this user. */
const STATE_DIR = ".datalab-mcp";
const TAKEOVER_FILE = "takeover";
const PROBE_TIMEOUT_MS = 2_000;
/** Polls after a kill: 20 x 150ms = 3s, well past a socket close. */
const RELEASE_ATTEMPTS = 20;
const RELEASE_INTERVAL_MS = 150;

export type ReclaimOutcome =
  /** Nothing was listening, or what listens already accepts this token. */
  | { kind: "not-needed" }
  /** It stood down when asked. */
  | { kind: "retired" }
  /** It did not, so the process holding the port was ended. */
  | { kind: "forced" }
  /** Something that is not our connector holds the port; left alone. */
  | { kind: "foreign" }
  /** Ours, refusing, and still there afterwards. */
  | { kind: "failed" };

export interface ReclaimDeps {
  /** The host entry carries it as text, the way it is written into config. */
  port?: number | string;
  /** What this run installs. An incumbent older than it is retired. */
  version?: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Three plain numbers on both sides, or false.
 *
 * Anything this cannot read is never grounds to end a process: the port is
 * shared with sessions a user is in the middle of.
 */
function olderThan(incumbent: string | null, installed?: string): boolean {
  const plain = /^\d+\.\d+\.\d+$/;
  if (incumbent === null || installed === undefined) return false;
  if (!plain.test(incumbent) || !plain.test(installed)) return false;
  const a = incumbent.split(".").map(Number);
  const b = installed.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}

function url(port: number, path: string): string {
  return `http://${HOST}:${String(port)}${path}`;
}

async function get(
  fetchImpl: typeof fetch,
  target: string,
): Promise<Response | null> {
  try {
    return await fetchImpl(target, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
}

async function post(
  fetchImpl: typeof fetch,
  target: string,
  body: unknown,
): Promise<Response | null> {
  try {
    return await fetchImpl(target, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
}

/**
 * Free, ours, or somebody else's — the last of which we never touch — plus
 * the version and pid it reports, which decide whether ours is worth keeping
 * and which process may be ended.
 */
export async function probePort(
  fetchImpl: typeof fetch,
  port: number,
): Promise<{
  state: "free" | "ours" | "foreign";
  version: string | null;
  pid: number | null;
}> {
  const res = await get(fetchImpl, url(port, "/bridge/health"));
  if (res === null) return { state: "free", version: null, pid: null };
  if (!res.ok) return { state: "foreign", version: null, pid: null };
  try {
    const body = (await res.json()) as {
      name?: unknown;
      version?: unknown;
      pid?: unknown;
    };
    if (body.name !== CONNECTOR_NAME) {
      return { state: "foreign", version: null, pid: null };
    }
    const pid =
      typeof body.pid === "number" && Number.isInteger(body.pid)
        ? body.pid
        : null;
    return {
      state: "ours",
      version: typeof body.version === "string" ? body.version : null,
      pid,
    };
  } catch {
    return { state: "foreign", version: null, pid: null };
  }
}

/**
 * Make the port answer to `token`, ending the holder if it will not.
 *
 * Order is deliberate: a connector that accepts this token and is not older
 * than the one being installed is left running, since ending it would drop the
 * sessions it is serving for no gain. Without a token only the version decides,
 * and the takeover secret goes only to a listener proven to be ours.
 */
export async function reclaimPort(
  io: Io,
  token: string | undefined,
  deps: ReclaimDeps = {},
): Promise<ReclaimOutcome> {
  const asked = typeof deps.port === "string" ? Number(deps.port) : deps.port;
  const port =
    asked !== undefined && Number.isInteger(asked) && asked > 0
      ? asked
      : DEFAULT_PORT;
  const fetchImpl = deps.fetchImpl ?? io.fetch ?? globalThis.fetch;
  const sleep =
    deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));

  const probe = await probePort(fetchImpl, port);
  if (probe.state === "free") return { kind: "not-needed" };
  if (probe.state === "foreign") return { kind: "foreign" };

  const older = olderThan(probe.version, deps.version);
  if (token === undefined) {
    if (!older) return { kind: "not-needed" };
    return retireWithoutToken(io, port, probe.pid, fetchImpl, sleep);
  }

  const authorised = await post(fetchImpl, url(port, "/mcp/authority"), {
    token,
  });
  // Accepting this token is not on its own a reason to keep it: install is how
  // the version on a machine moves, and a connector that answers holds the one
  // it was started with for the life of the session.
  if (authorised?.status === 204 && !older) {
    return { kind: "not-needed" };
  }

  const stood = await post(fetchImpl, url(port, "/mcp/shutdown"), { token });
  if (stood?.status === 200 && (await released(fetchImpl, port, sleep))) {
    return { kind: "retired" };
  }
  return endListener(io, port, probe.pid, fetchImpl, sleep);
}

/** Ask with the takeover secret, then end it, both only once it is proven ours. */
async function retireWithoutToken(
  io: Io,
  port: number,
  reportedPid: number | null,
  fetchImpl: typeof fetch,
  sleep: (ms: number) => Promise<void>,
): Promise<ReclaimOutcome> {
  const pid = await ownListener(
    io.platform,
    port,
    reportedPid,
    listenerDeps(io),
  );
  if (pid === null) return { kind: "failed" };
  const secret = await readTakeover(io);
  if (secret !== null) {
    const stood = await post(fetchImpl, url(port, "/mcp/shutdown"), {
      token: secret,
    });
    if (stood?.status === 200 && (await released(fetchImpl, port, sleep))) {
      return { kind: "retired" };
    }
  }
  return endListener(io, port, reportedPid, fetchImpl, sleep);
}

/** The secret a running connector leaves for this user, or null. */
async function readTakeover(io: Io): Promise<string | null> {
  try {
    const raw = await io.readFile(
      joinPath(io, io.homedir(), STATE_DIR, TAKEOVER_FILE),
    );
    const secret = raw.trim();
    return secret === "" ? null : secret;
  } catch {
    return null;
  }
}

function listenerDeps(io: Io): ListenerDeps {
  return {
    capture: io.capture,
    killPid: io.killPid,
    selfPid: process.pid,
    uid: io.uid,
  };
}

async function released(
  fetchImpl: typeof fetch,
  port: number,
  sleep: (ms: number) => Promise<void>,
): Promise<boolean> {
  for (let i = 0; i < RELEASE_ATTEMPTS; i += 1) {
    await sleep(RELEASE_INTERVAL_MS);
    if ((await probePort(fetchImpl, port)).state === "free") return true;
  }
  return false;
}

/** Ends the holder only when the gate in port-listener proves it ours. */
async function endListener(
  io: Io,
  port: number,
  reportedPid: number | null,
  fetchImpl: typeof fetch,
  sleep: (ms: number) => Promise<void>,
): Promise<ReclaimOutcome> {
  const ended = await endPortListener(
    io.platform,
    port,
    reportedPid,
    listenerDeps(io),
  );
  if (!ended) return { kind: "failed" };
  return (await released(fetchImpl, port, sleep))
    ? { kind: "forced" }
    : { kind: "failed" };
}
