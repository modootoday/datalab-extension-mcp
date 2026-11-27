/**
 * Install is the only moment that can clear a wedged port: the browser cannot
 * (every route needs the token being refused), and waiting cannot (idle-exit
 * needs zero connections). So these cases are the recovery for every user who
 * will never open a terminal on purpose.
 */
import { describe, expect, it, vi } from "vitest";

import { probePort, reclaimPort } from "../src/reclaim.js";
import { createMemIo } from "./helpers.js";

const TOKEN = "a".repeat(40);
const SECRET = "b".repeat(64);
const HEALTH = "http://127.0.0.1:8765/bridge/health";
const PID = 4321;
const UID = 1000;
const OUR_COMMAND = `${String(UID)} node /usr/lib/node_modules/@modootoday/datalab-extension-mcp/dist/cli.js serve`;

const ok = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

/** Answers health as ours, and whatever the case says for the rest. */
function daemon(opts: {
  authority?: number;
  shutdown?: number;
  takeoverShutdown?: number;
  diesAfter?: "shutdown" | "kill" | "never";
  version?: string;
  pid?: number | null;
}) {
  let alive = true;
  const seen: string[] = [];
  const fetchImpl = vi.fn(
    async (url: string, init?: { method?: string; body?: string }) => {
      const target = String(url);
      if (target === HEALTH) {
        if (!alive) throw new Error("ECONNREFUSED");
        const pid = opts.pid === undefined ? PID : opts.pid;
        return ok({
          name: "datalab-extension-mcp-server",
          version: opts.version ?? "1.8.15",
          ...(pid === null ? {} : { pid }),
        });
      }
      seen.push(`${init?.method ?? "GET"} ${target}`);
      if (target.endsWith("/mcp/authority")) {
        return ok(null, opts.authority ?? 403);
      }
      if (target.endsWith("/mcp/shutdown")) {
        const sent = JSON.parse(init?.body ?? "{}") as { token?: string };
        const status =
          sent.token === SECRET
            ? (opts.takeoverShutdown ?? 403)
            : (opts.shutdown ?? 403);
        if (status === 200 && opts.diesAfter === "shutdown") alive = false;
        return ok(null, status);
      }
      return ok(null, 404);
    },
  ) as unknown as typeof fetch;
  return {
    seen,
    fetchImpl,
    kill: () => {
      if (opts.diesAfter === "kill") alive = false;
    },
  };
}

/** The system's view of the port: who listens, and what that process is. */
function io(
  kill: () => void,
  opts: {
    platform?: string;
    listing?: string;
    owner?: string;
    takeover?: string;
  } = {},
) {
  const platform = opts.platform ?? "linux";
  const files: Record<string, string> = {};
  if (opts.takeover !== undefined) {
    files["/home/u/.datalab-mcp/takeover"] = `${opts.takeover}\n`;
  }
  const mem = createMemIo({ platform, home: "/home/u", files });
  const listing = opts.listing ?? `p${String(PID)}\nf21\nn127.0.0.1:8765\n`;
  const owner = opts.owner ?? OUR_COMMAND;
  const capture = vi.fn(async (command: string) => {
    if (command === "lsof" || command === "netstat") return listing;
    if (command === "ps") return owner;
    return "";
  });
  const killPid = vi.fn(() => {
    kill();
  });
  return {
    io: { ...mem.io, platform, capture, killPid, uid: UID },
    killPid,
    capture,
  };
}

describe("reclaimPort", () => {
  it("leaves a connector that already accepts this token", async () => {
    const d = daemon({ authority: 204 });
    const h = io(d.kill);
    const out = await reclaimPort(h.io, TOKEN, {
      fetchImpl: d.fetchImpl,
      sleep: async () => {},
    });
    expect(out).toEqual({ kind: "not-needed" });
    expect(h.killPid).not.toHaveBeenCalled();
  });

  /**
   * The case a user reaches by running install to move their version: the old
   * connector still holds the token, so authority alone would keep it, and the
   * machine would answer on the version it started with.
   */
  it("retires an authorised connector older than the one being installed", async () => {
    const d = daemon({
      authority: 204,
      shutdown: 200,
      diesAfter: "shutdown",
      version: "1.8.17",
    });
    const h = io(d.kill);
    const out = await reclaimPort(h.io, TOKEN, {
      version: "1.8.20",
      fetchImpl: d.fetchImpl,
      sleep: async () => {},
    });
    expect(out).toEqual({ kind: "retired" });
  });

  it("keeps an authorised connector already at the installed version", async () => {
    const d = daemon({ authority: 204, version: "1.8.20" });
    const h = io(d.kill);
    const out = await reclaimPort(h.io, TOKEN, {
      version: "1.8.20",
      fetchImpl: d.fetchImpl,
      sleep: async () => {},
    });
    expect(out).toEqual({ kind: "not-needed" });
    expect(h.killPid).not.toHaveBeenCalled();
  });

  it("keeps an authorised connector whose version cannot be read", async () => {
    const d = daemon({ authority: 204, version: "nightly" });
    const h = io(d.kill);
    const out = await reclaimPort(h.io, TOKEN, {
      version: "1.8.20",
      fetchImpl: d.fetchImpl,
      sleep: async () => {},
    });
    expect(out).toEqual({ kind: "not-needed" });
  });

  it("asks before ending it, and stops there when asking works", async () => {
    const d = daemon({ shutdown: 200, diesAfter: "shutdown" });
    const h = io(d.kill);
    const out = await reclaimPort(h.io, TOKEN, {
      fetchImpl: d.fetchImpl,
      sleep: async () => {},
    });
    expect(out).toEqual({ kind: "retired" });
    expect(h.killPid).not.toHaveBeenCalled();
  });

  it("ends a refusing connector proven to be ours", async () => {
    const d = daemon({ shutdown: 403, diesAfter: "kill" });
    const h = io(d.kill);
    const out = await reclaimPort(h.io, TOKEN, {
      fetchImpl: d.fetchImpl,
      sleep: async () => {},
    });
    expect(out).toEqual({ kind: "forced" });
    expect(h.killPid).toHaveBeenCalledExactlyOnceWith(PID);
  });

  it("never touches a stranger on the port", async () => {
    const fetchImpl = vi.fn(async () =>
      ok({ name: "something-else" }),
    ) as unknown as typeof fetch;
    const h = io(() => {});
    const out = await reclaimPort(h.io, TOKEN, {
      fetchImpl,
      sleep: async () => {},
    });
    expect(out).toEqual({ kind: "foreign" });
    expect(h.killPid).not.toHaveBeenCalled();
  });

  it("does nothing when the port is free", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.reject(new Error("ECONNREFUSED")),
    ) as unknown as typeof fetch;
    const h = io(() => {});
    expect(
      await reclaimPort(h.io, TOKEN, { fetchImpl, sleep: async () => {} }),
    ).toEqual({ kind: "not-needed" });
    expect(h.killPid).not.toHaveBeenCalled();
  });

  it("reports failure rather than claiming a port it did not clear", async () => {
    const d = daemon({ shutdown: 403, diesAfter: "never" });
    const h = io(d.kill);
    const out = await reclaimPort(h.io, TOKEN, {
      fetchImpl: d.fetchImpl,
      sleep: async () => {},
    });
    expect(out).toEqual({ kind: "failed" });
  });

  it("ends nothing on Windows, where the command line cannot be read", async () => {
    const d = daemon({ shutdown: 403, diesAfter: "kill" });
    const h = io(d.kill, {
      platform: "win32",
      listing: `  TCP    127.0.0.1:8765         0.0.0.0:0              LISTENING       ${String(PID)}`,
    });
    const out = await reclaimPort(h.io, TOKEN, {
      fetchImpl: d.fetchImpl,
      sleep: async () => {},
    });
    expect(out).toEqual({ kind: "failed" });
    expect(h.killPid).not.toHaveBeenCalled();
  });
});

describe("reclaimPort without a token", () => {
  const older = { version: "1.17.1" } as const;
  const run = (d: ReturnType<typeof daemon>, h: ReturnType<typeof io>) =>
    reclaimPort(h.io, undefined, {
      version: "1.18.2",
      fetchImpl: d.fetchImpl,
      sleep: async () => {},
    });

  it("keeps a connector at the installed version and asks it nothing", async () => {
    const d = daemon({ version: "1.18.2" });
    const h = io(d.kill);
    expect(await run(d, h)).toEqual({ kind: "not-needed" });
    expect(d.seen).toEqual([]);
    expect(h.killPid).not.toHaveBeenCalled();
  });

  it("keeps a connector whose version cannot be read", async () => {
    const d = daemon({ version: "nightly", diesAfter: "kill" });
    const h = io(d.kill);
    expect(await run(d, h)).toEqual({ kind: "not-needed" });
    expect(h.killPid).not.toHaveBeenCalled();
  });

  it("tries the takeover secret before any kill", async () => {
    const d = daemon({
      ...older,
      takeoverShutdown: 200,
      diesAfter: "shutdown",
    });
    const h = io(d.kill, { takeover: SECRET });
    expect(await run(d, h)).toEqual({ kind: "retired" });
    expect(d.seen).toEqual(["POST http://127.0.0.1:8765/mcp/shutdown"]);
    expect(h.killPid).not.toHaveBeenCalled();
  });

  it("ends an older connector proven ours when the secret is refused", async () => {
    const d = daemon({ ...older, diesAfter: "kill" });
    const h = io(d.kill, { takeover: SECRET });
    expect(await run(d, h)).toEqual({ kind: "forced" });
    expect(h.killPid).toHaveBeenCalledExactlyOnceWith(PID);
  });

  it("leaves a second listener on [::1] untouched", async () => {
    const d = daemon({ ...older, diesAfter: "kill" });
    const h = io(d.kill, {
      listing: `p${String(PID)}\nf21\nn127.0.0.1:8765\np9999\nf21\nn[::1]:8765\n`,
    });
    expect(await run(d, h)).toEqual({ kind: "forced" });
    expect(h.killPid).toHaveBeenCalledExactlyOnceWith(PID);
  });

  it("ends nothing when more than one process listens on 127.0.0.1", async () => {
    const d = daemon({ ...older, diesAfter: "kill" });
    const h = io(d.kill, {
      listing: `p${String(PID)}\nn127.0.0.1:8765\np9999\nn127.0.0.1:8765\n`,
    });
    expect(await run(d, h)).toEqual({ kind: "failed" });
    expect(h.killPid).not.toHaveBeenCalled();
  });

  it("ends nothing when the reported pid is not the listener", async () => {
    const d = daemon({ ...older, pid: 1234, diesAfter: "kill" });
    const h = io(d.kill, { takeover: SECRET });
    expect(await run(d, h)).toEqual({ kind: "failed" });
    expect(d.seen).toEqual([]);
    expect(h.killPid).not.toHaveBeenCalled();
  });

  it("ends nothing when the connector reports no pid", async () => {
    const d = daemon({ ...older, pid: null, diesAfter: "kill" });
    const h = io(d.kill);
    expect(await run(d, h)).toEqual({ kind: "failed" });
    expect(h.killPid).not.toHaveBeenCalled();
  });

  it("leaves a process answering the health shape that runs another program", async () => {
    const d = daemon({ ...older, diesAfter: "kill" });
    const h = io(d.kill, {
      takeover: SECRET,
      owner: `${String(UID)} python3 -m http.server 8765`,
    });
    expect(await run(d, h)).toEqual({ kind: "failed" });
    expect(d.seen).toEqual([]);
    expect(h.killPid).not.toHaveBeenCalled();
  });

  it("leaves a process owned by another user", async () => {
    const d = daemon({ ...older, diesAfter: "kill" });
    const h = io(d.kill, {
      owner: OUR_COMMAND.replace(String(UID), "0"),
    });
    expect(await run(d, h)).toEqual({ kind: "failed" });
    expect(h.killPid).not.toHaveBeenCalled();
  });
});

describe("probePort", () => {
  it("an unparseable answer is a stranger, not ours", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("not json");
      },
    })) as unknown as typeof fetch;
    expect(await probePort(fetchImpl, 8765)).toEqual({
      state: "foreign",
      version: null,
      pid: null,
    });
  });

  it("carries the version and pid ours reports", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        name: "datalab-extension-mcp-server",
        version: "1.8.17",
        pid: PID,
      }),
    })) as unknown as typeof fetch;
    expect(await probePort(fetchImpl, 8765)).toEqual({
      state: "ours",
      version: "1.8.17",
      pid: PID,
    });
  });
});
