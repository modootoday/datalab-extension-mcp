/**
 * Install is the only moment that can clear a wedged port: the browser cannot
 * (every route needs the token being refused), and waiting cannot (idle-exit
 * needs zero connections). So these cases are the recovery for every user who
 * will never open a terminal on purpose.
 */
import { describe, expect, it, vi } from "vitest";

import { killCommand, probePort, reclaimPort } from "../src/reclaim.js";
import { createMemIo } from "./helpers.js";

const TOKEN = "a".repeat(40);
const HEALTH = "http://127.0.0.1:8765/bridge/health";

const ok = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

/** Answers health as ours, and whatever the case says for the rest. */
function daemon(opts: {
  authority?: number;
  shutdown?: number;
  diesAfter?: "shutdown" | "kill" | "never";
  version?: string;
}) {
  let alive = true;
  const seen: string[] = [];
  const fetchImpl = vi.fn(async (url: string, init?: { method?: string }) => {
    const target = String(url);
    if (target === HEALTH) {
      if (!alive) throw new Error("ECONNREFUSED");
      return ok({
        name: "datalab-extension-mcp-server",
        version: opts.version ?? "1.8.15",
      });
    }
    seen.push(`${init?.method ?? "GET"} ${target}`);
    if (target.endsWith("/mcp/authority")) {
      return ok(null, opts.authority ?? 403);
    }
    if (target.endsWith("/mcp/shutdown")) {
      const status = opts.shutdown ?? 403;
      if (status === 200 && opts.diesAfter === "shutdown") alive = false;
      return ok(null, status);
    }
    return ok(null, 404);
  }) as unknown as typeof fetch;
  return {
    seen,
    fetchImpl,
    kill: () => {
      if (opts.diesAfter === "kill") alive = false;
    },
  };
}

function io(kill: () => void, platform = "linux") {
  const mem = createMemIo({ platform, home: "/home/u" });
  const spawn = vi.fn(async () => {
    kill();
    return { code: 0 };
  });
  return { io: { ...mem.io, platform, spawn }, spawn };
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
    expect(h.spawn).not.toHaveBeenCalled();
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
    expect(h.spawn).not.toHaveBeenCalled();
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
    expect(h.spawn).not.toHaveBeenCalled();
  });

  /** The case every field install is in: a daemon holding a token nobody has. */
  it("ends it when it refuses — otherwise nothing ever clears the port", async () => {
    const d = daemon({ shutdown: 403, diesAfter: "kill" });
    const h = io(d.kill);
    const out = await reclaimPort(h.io, TOKEN, {
      fetchImpl: d.fetchImpl,
      sleep: async () => {},
    });
    expect(out).toEqual({ kind: "forced" });
    expect(h.spawn).toHaveBeenCalled();
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
    expect(h.spawn).not.toHaveBeenCalled();
  });

  it("does nothing when the port is free", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.reject(new Error("ECONNREFUSED")),
    ) as unknown as typeof fetch;
    const h = io(() => {});
    expect(
      await reclaimPort(h.io, TOKEN, { fetchImpl, sleep: async () => {} }),
    ).toEqual({ kind: "not-needed" });
    expect(h.spawn).not.toHaveBeenCalled();
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
    });
  });

  it("carries the version ours reports", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        name: "datalab-extension-mcp-server",
        version: "1.8.17",
      }),
    })) as unknown as typeof fetch;
    expect(await probePort(fetchImpl, 8765)).toEqual({
      state: "ours",
      version: "1.8.17",
    });
  });
});

describe("killCommand", () => {
  // The command names the port; a build that drops it would end whatever
  // process the shell happened to match.
  it("targets the given port on each platform we ship", () => {
    for (const platform of ["win32", "darwin", "linux"]) {
      const cmd = killCommand(platform, 9999);
      expect(cmd).not.toBeNull();
      expect(JSON.stringify(cmd)).toContain("9999");
    }
  });

  it("refuses to guess on a platform it has no command for", () => {
    expect(killCommand("aix", 8765)).toBeNull();
  });
});
