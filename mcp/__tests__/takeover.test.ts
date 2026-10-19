/**
 * The conflict this exists for: a daemon holding the port with a token no host
 * on this machine has. Nothing can register with it, stop it, or wait it out
 * while a host is connected, so the adapter has to be able to retire it.
 */
import { describe, expect, it, vi } from "vitest";

import { ensureDaemonRunning } from "../src/adapter.js";

const SECRET = "f".repeat(64);
const OTHER = "abc123";

/** A socket stand-in: the probe only connects and destroys. */
const socket = () => ({ destroy: () => {} }) as never;

function harness(opts: { takeover: string | null }) {
  const calls: string[] = [];
  let held = true;
  return {
    calls,
    deps: {
      // Held until the shutdown lands, free afterwards.
      connect: async () => (held ? socket() : null),
      spawn: () => {
        calls.push("spawn");
      },
      sleep: async () => {},
      log: () => {},
      attempts: 3,
      intervalMs: 0,
      selfVersion: "1.8.15",
      token: OTHER,
      readVersion: async () => "1.8.15",
      checkAuthority: async () => false,
      readTakeover: () => opts.takeover,
      // Never the real one: it ends whatever listens on 8765, which on a
      // developer's machine is their own connector.
      killOwner: () => false,
      shutdown: async (_base: string, presented: string) => {
        calls.push(`shutdown:${presented === SECRET ? "proof" : "token"}`);
        if (presented !== SECRET) return false;
        held = false;
        return true;
      },
    },
  };
}

describe("authority conflict", () => {
  it("retires the holder with the takeover proof and starts ours", async () => {
    const h = harness({ takeover: SECRET });
    await ensureDaemonRunning({ host: "127.0.0.1", port: 8765, ...h.deps });
    expect(h.calls).toEqual(["shutdown:proof", "spawn"]);
  });

  /**
   * An older daemon has no takeover file. The message has to carry the move
   * that works, because no screen in the browser can do anything here.
   */
  it("without the proof it says what actually clears the port", async () => {
    const h = harness({ takeover: null });
    await expect(
      ensureDaemonRunning({ host: "127.0.0.1", port: 8765, ...h.deps }),
    ).rejects.toThrow(/Quit every AI app/);
    expect(h.calls).not.toContain("spawn");
  });

  it("never presents its own token as the proof", async () => {
    const h = harness({ takeover: null });
    await ensureDaemonRunning({
      host: "127.0.0.1",
      port: 8765,
      ...h.deps,
    }).catch(() => {});
    expect(h.calls).not.toContain("shutdown:token");
  });
});

/**
 * The self-update path lands here too: the adapter re-executes itself as the
 * canonical build, and that new process meets the daemon the old one left. A
 * token mismatch there would strand the promotion the watcher just made.
 */
describe("update path", () => {
  const SECRET = "f".repeat(64);

  function updating(opts: { tokenWorks: boolean; takeover: string | null }) {
    const calls: string[] = [];
    let held = true;
    return {
      calls,
      deps: {
        host: "127.0.0.1",
        port: 8765,
        connect: async () => (held ? ({ destroy: () => {} } as never) : null),
        spawn: () => {
          calls.push("spawn");
        },
        sleep: async () => {},
        log: () => {},
        attempts: 3,
        intervalMs: 0,
        selfVersion: "1.8.17",
        token: "mine",
        // Older than us: this is the update branch.
        readVersion: async () => "1.8.16",
        checkAuthority: async () => false,
        readTakeover: () => opts.takeover,
        killOwner: () => false,
        shutdown: async (_b: string, presented: string) => {
          const ok =
            presented === SECRET ? opts.takeover !== null : opts.tokenWorks;
          calls.push(`shutdown:${presented === SECRET ? "proof" : "token"}`);
          if (ok) held = false;
          return ok;
        },
      },
    };
  }

  it("uses the token when it still matches", async () => {
    const h = updating({ tokenWorks: true, takeover: SECRET });
    await ensureDaemonRunning(h.deps);
    expect(h.calls).toEqual(["shutdown:token", "spawn"]);
  });

  it("falls back to the proof when the token has moved on", async () => {
    const h = updating({ tokenWorks: false, takeover: SECRET });
    await ensureDaemonRunning(h.deps);
    expect(h.calls).toEqual(["shutdown:token", "shutdown:proof", "spawn"]);
  });

  it("still refuses to guess when neither works", async () => {
    const h = updating({ tokenWorks: false, takeover: null });
    await expect(ensureDaemonRunning(h.deps)).rejects.toThrow(/conflict/);
    expect(h.calls).not.toContain("spawn");
  });
});

/**
 * Last resort. A daemon answering to neither credential serves nobody
 * correctly, and while it holds the port at least one host stays down —
 * whereas any host that needed it respawns it on its next call. Only reached
 * after readVersion has identified the holder as ours.
 */
describe("seizing the port", () => {
  function wedged(opts: { platformKills: boolean }) {
    const calls: string[] = [];
    let held = true;
    return {
      calls,
      deps: {
        host: "127.0.0.1",
        port: 8765,
        connect: async () => (held ? ({ destroy: () => {} } as never) : null),
        spawn: () => {
          calls.push("spawn");
        },
        sleep: async () => {},
        log: () => {},
        attempts: 3,
        intervalMs: 0,
        selfVersion: "1.8.18",
        token: "mine",
        readVersion: async () => "1.8.18",
        checkAuthority: async () => false,
        readTakeover: () => null,
        shutdown: async () => false,
        killOwner: () => {
          calls.push("kill");
          if (opts.platformKills) held = false;
          return opts.platformKills;
        },
      },
    };
  }

  it("takes the port back and starts ours", async () => {
    const h = wedged({ platformKills: true });
    await ensureDaemonRunning(h.deps);
    expect(h.calls).toEqual(["kill", "spawn"]);
  });

  it("still throws when the platform has no way to do it", async () => {
    const h = wedged({ platformKills: false });
    await expect(ensureDaemonRunning(h.deps)).rejects.toThrow(/conflict/);
    expect(h.calls).toEqual(["kill"]);
  });

  /** A stranger on the port never reaches the kill — readVersion refuses first. */
  it("a stranger on the port is never ended", async () => {
    const calls: string[] = [];
    await expect(
      ensureDaemonRunning({
        host: "127.0.0.1",
        port: 8765,
        connect: async () => ({ destroy: () => {} }) as never,
        spawn: () => calls.push("spawn"),
        sleep: async () => {},
        log: () => {},
        attempts: 1,
        intervalMs: 0,
        selfVersion: "1.8.18",
        token: "mine",
        readVersion: async () => null,
        killOwner: () => {
          calls.push("kill");
          return true;
        },
      }),
    ).rejects.toThrow(/something other than the DataLab connector/);
    expect(calls).toEqual([]);
  });
});
