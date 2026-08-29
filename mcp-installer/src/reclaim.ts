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
import type { Io } from "./types.js";

/** Where the connector listens, and how it identifies itself there. */
const DEFAULT_PORT = 8765;
const HOST = "127.0.0.1";
const CONNECTOR_NAME = "datalab-extension-mcp-server";
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
 * the version it reports, which decides whether ours is worth keeping.
 */
export async function probePort(
  fetchImpl: typeof fetch,
  port: number,
): Promise<{ state: "free" | "ours" | "foreign"; version: string | null }> {
  const res = await get(fetchImpl, url(port, "/bridge/health"));
  if (res === null) return { state: "free", version: null };
  if (!res.ok) return { state: "foreign", version: null };
  try {
    const body = (await res.json()) as { name?: unknown; version?: unknown };
    if (body.name !== CONNECTOR_NAME)
      return { state: "foreign", version: null };
    return {
      state: "ours",
      version: typeof body.version === "string" ? body.version : null,
    };
  } catch {
    return { state: "foreign", version: null };
  }
}

/**
 * The command that ends whatever listens on the port.
 *
 * One line rather than read-pid-then-kill, because the io seam reports an exit
 * code and no output. Whether it worked is answered by probing the port again,
 * which is the fact that matters anyway.
 */
export function killCommand(
  platform: string,
  port: number,
): { command: string; args: string[]; shell: boolean } | null {
  const p = String(port);
  if (platform === "win32") {
    return {
      command: "powershell",
      args: [
        "-NoProfile",
        "-Command",
        `Get-NetTCPConnection -LocalPort ${p} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`,
      ],
      shell: true,
    };
  }
  if (platform === "darwin" || platform === "linux") {
    return {
      command: "sh",
      args: [
        "-c",
        `pids=$(lsof -ti tcp:${p} -sTCP:LISTEN 2>/dev/null); if [ -n "$pids" ]; then kill -9 $pids; fi`,
      ],
      shell: false,
    };
  }
  return null;
}

/**
 * Make the port answer to `token`, ending the holder if it will not.
 *
 * Order is deliberate: a connector that accepts this token and is not older
 * than the one being installed is left running, since ending it would drop the
 * sessions it is serving for no gain.
 */
export async function reclaimPort(
  io: Io,
  token: string,
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

  const authorised = await post(fetchImpl, url(port, "/mcp/authority"), {
    token,
  });
  // Accepting this token is not on its own a reason to keep it: install is how
  // the version on a machine moves, and a connector that answers holds the one
  // it was started with for the life of the session.
  if (authorised?.status === 204 && !olderThan(probe.version, deps.version)) {
    return { kind: "not-needed" };
  }

  const stood = await post(fetchImpl, url(port, "/mcp/shutdown"), { token });
  const gone = async (): Promise<boolean> => {
    for (let i = 0; i < RELEASE_ATTEMPTS; i += 1) {
      await sleep(RELEASE_INTERVAL_MS);
      if ((await probePort(fetchImpl, port)).state === "free") return true;
    }
    return false;
  };
  if (stood?.status === 200 && (await gone())) return { kind: "retired" };

  const kill = killCommand(io.platform, port);
  if (kill === null) return { kind: "failed" };
  await io.spawn(kill.command, kill.args, { shell: kill.shell });
  return (await gone()) ? { kind: "forced" } : { kind: "failed" };
}
