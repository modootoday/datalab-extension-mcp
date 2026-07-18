/**
 * Adapter unit tests — the proxy's behaviour with every edge injected.
 *
 * No real socket, no real HTTP, no real child process here: the readiness
 * probe, the spawn, and the fetch are all stubbed so each branch is asserted in
 * isolation. The one exception is a single fast-path test that uses a real
 * loopback listener, which exercises the default `tryConnect` fallback.
 */
import { createServer, type Server as NetServer } from "node:net";

import { describe, expect, it, vi } from "vitest";

import {
  createAdapterServer,
  ensureDaemonRunning,
  isOlderVersion,
  pushToolChanges,
  runAdapter,
  type FetchImpl,
  type SubscribeImpl,
} from "../src/adapter.js";

type Handler = (req: unknown, extra: unknown) => Promise<unknown>;

/** Reach the registered handlers the way a host's request would arrive. */
function handlers(
  server: ReturnType<typeof createAdapterServer>,
): Map<string, Handler> {
  return (server as unknown as { _requestHandlers: Map<string, Handler> })
    ._requestHandlers;
}

/** A fetch that answers with a canned JSON-RPC body, capturing the request. */
function jsonFetch(
  body: unknown,
  seen?: { url?: string; sent?: unknown },
): FetchImpl {
  return async (url, init) => {
    if (seen) {
      seen.url = url;
      seen.sent = JSON.parse(init.body);
    }
    return { text: async () => JSON.stringify(body) };
  };
}

describe("tools/list proxy", () => {
  it("returns the daemon's tools", async () => {
    const seen: { url?: string; sent?: unknown } = {};
    const server = createAdapterServer({
      host: "127.0.0.1",
      port: 9999,
      fetchImpl: jsonFetch(
        {
          jsonrpc: "2.0",
          id: 1,
          result: { tools: [{ name: "keyword_trend" }] },
        },
        seen,
      ),
    });
    await expect(
      handlers(server).get("tools/list")!({ method: "tools/list" }, {}),
    ).resolves.toEqual({ tools: [{ name: "keyword_trend" }] });
    expect(seen.url).toBe("http://127.0.0.1:9999/mcp");
    expect(seen.sent).toMatchObject({ jsonrpc: "2.0", method: "tools/list" });
  });

  it("degrades to an empty list on a daemon error", async () => {
    const server = createAdapterServer({
      fetchImpl: jsonFetch({
        jsonrpc: "2.0",
        id: 1,
        error: { code: -32603, message: "boom" },
      }),
      log: () => {},
    });
    await expect(
      handlers(server).get("tools/list")!({ method: "tools/list" }, {}),
    ).resolves.toEqual({ tools: [] });
  });

  it("degrades to an empty list when the fetch rejects", async () => {
    const server = createAdapterServer({
      fetchImpl: () => Promise.reject(new Error("socket gone")),
      log: () => {},
    });
    await expect(
      handlers(server).get("tools/list")!({ method: "tools/list" }, {}),
    ).resolves.toEqual({ tools: [] });
  });
});

describe("tools/call proxy", () => {
  it("forwards name + arguments and returns the daemon result", async () => {
    const seen: { url?: string; sent?: unknown } = {};
    const result = { content: [{ type: "text", text: '{"points":[1,2]}' }] };
    const server = createAdapterServer({
      fetchImpl: jsonFetch({ jsonrpc: "2.0", id: 1, result }, seen),
    });
    await expect(
      handlers(server).get("tools/call")!(
        {
          method: "tools/call",
          params: { name: "keyword_trend", arguments: { keyword: "x" } },
        },
        {},
      ),
    ).resolves.toEqual(result);
    expect(seen.sent).toMatchObject({
      method: "tools/call",
      params: { name: "keyword_trend", arguments: { keyword: "x" } },
    });
  });

  it("defaults missing arguments to an empty object", async () => {
    const seen: { url?: string; sent?: unknown } = {};
    const server = createAdapterServer({
      fetchImpl: jsonFetch(
        { jsonrpc: "2.0", id: 1, result: { content: [] } },
        seen,
      ),
    });
    await handlers(server).get("tools/call")!(
      { method: "tools/call", params: { name: "my_realtime" } },
      {},
    );
    expect(seen.sent).toMatchObject({
      params: { name: "my_realtime", arguments: {} },
    });
  });

  it("returns a readable tool result when the fetch rejects", async () => {
    const server = createAdapterServer({
      fetchImpl: () => Promise.reject(new Error("socket gone")),
      log: () => {},
    });
    const out = (await handlers(server).get("tools/call")!(
      {
        method: "tools/call",
        params: { name: "keyword_trend", arguments: {} },
      },
      {},
    )) as { isError: boolean; content: Array<{ text: string }> };
    expect(out.isError).toBe(true);
    // A frozen, user-actionable Korean message — not a bare protocol error.
    expect(out.content[0].text).toContain("데이터랩툴즈");
  });

  it("re-raises a daemon JSON-RPC error as a thrown McpError", async () => {
    const server = createAdapterServer({
      fetchImpl: jsonFetch({
        jsonrpc: "2.0",
        id: 1,
        error: { code: -32603, message: "패널이 닫혀 있어요" },
      }),
      log: () => {},
    });
    await expect(
      handlers(server).get("tools/call")!(
        {
          method: "tools/call",
          params: { name: "keyword_trend", arguments: {} },
        },
        {},
      ),
    ).rejects.toThrow("패널이 닫혀 있어요");
  });
});

describe("capabilities", () => {
  it("registers exactly tools/list and tools/call", () => {
    const server = createAdapterServer({});
    const registered = [...handlers(server).keys()].filter((k) =>
      k.startsWith("tools/"),
    );
    expect(registered.sort()).toEqual(["tools/call", "tools/list"]);
  });

  it("declares tools.listChanged so the host expects change notifications", () => {
    const server = createAdapterServer({});
    const caps = (
      server as unknown as {
        _capabilities: { tools?: { listChanged?: boolean } };
      }
    )._capabilities;
    expect(caps.tools?.listChanged).toBe(true);
  });
});

describe("pushToolChanges", () => {
  it("forwards a tools_changed event to the host and ignores the rest", async () => {
    const notifyHost = vi.fn().mockResolvedValue(undefined);
    const controller = new AbortController();
    const subscribe: SubscribeImpl = async (_url, onEvent) => {
      onEvent(JSON.stringify({ type: "tools_changed" }));
      onEvent(JSON.stringify({ type: "hb" })); // not a catalog change
      onEvent("not json at all"); // a heartbeat comment slipping through
      controller.abort(); // one pass, then stop
    };
    await pushToolChanges({
      mcpUrl: "http://127.0.0.1:8765/mcp",
      notifyHost,
      subscribe,
      sleep: async () => {},
      signal: controller.signal,
    });
    expect(notifyHost).toHaveBeenCalledTimes(1);
  });

  it("subscribes to /mcp/notifications derived from the mcp url", async () => {
    const controller = new AbortController();
    let seen = "";
    const subscribe: SubscribeImpl = async (url) => {
      seen = url;
      controller.abort();
    };
    await pushToolChanges({
      mcpUrl: "http://127.0.0.1:9000/mcp",
      notifyHost: async () => {},
      subscribe,
      sleep: async () => {},
      signal: controller.signal,
    });
    expect(seen).toBe("http://127.0.0.1:9000/mcp/notifications");
  });

  it("reconnects after the stream drops, until aborted", async () => {
    const controller = new AbortController();
    let calls = 0;
    const subscribe: SubscribeImpl = async () => {
      calls += 1;
      if (calls === 1) throw new Error("stream dropped");
      controller.abort(); // second attempt: stop cleanly
    };
    await pushToolChanges({
      mcpUrl: "http://127.0.0.1:8765/mcp",
      notifyHost: async () => {},
      subscribe,
      sleep: async () => {},
      signal: controller.signal,
    });
    expect(calls).toBe(2);
  });

  it("backs off with decorrelated jitter, growing then capping (P3-4)", async () => {
    // Repeated fast failures with a clock that never advances (each connect
    // fails immediately, so no reset): the delay grows 250→750→2250→5000 and
    // caps. rng=1 selects the top of each window for a deterministic assertion.
    const waits: number[] = [];
    const controller = new AbortController();
    let calls = 0;
    const subscribe: SubscribeImpl = async () => {
      calls += 1;
      if (calls >= 4) controller.abort();
      throw new Error("down");
    };
    await pushToolChanges({
      mcpUrl: "http://127.0.0.1:8765/mcp",
      notifyHost: async () => {},
      subscribe,
      sleep: async (ms) => {
        waits.push(ms);
      },
      now: () => 1000, // never advances → never a "held" reset
      rng: () => 1,
      signal: controller.signal,
    });
    expect(waits).toEqual([750, 2250, 5000]);
  });

  it("resets the backoff after a subscription that held (P3-4)", async () => {
    // Each subscription "holds" past the base interval before dropping, so the
    // backoff resets every time — a long-lived connection reconnects promptly.
    const waits: number[] = [];
    const controller = new AbortController();
    let calls = 0;
    let clock = 0;
    const now = (): number => (clock += 300); // start→end gap is 300ms ≥ base
    const subscribe: SubscribeImpl = async () => {
      calls += 1;
      if (calls >= 3) controller.abort();
      // resolves (held), does not throw
    };
    await pushToolChanges({
      mcpUrl: "http://127.0.0.1:8765/mcp",
      notifyHost: async () => {},
      subscribe,
      sleep: async (ms) => {
        waits.push(ms);
      },
      now,
      rng: () => 1,
      signal: controller.signal,
    });
    expect(waits).toEqual([750, 750]);
  });
});

describe("isOlderVersion", () => {
  it("orders by major, minor, then patch", () => {
    expect(isOlderVersion("0.0.7", "0.0.8")).toBe(true);
    expect(isOlderVersion("0.0.8", "0.0.7")).toBe(false);
    expect(isOlderVersion("0.9.9", "1.0.0")).toBe(true);
    expect(isOlderVersion("1.2.0", "1.1.9")).toBe(false);
  });

  it("is false for equal versions (no needless replace)", () => {
    expect(isOlderVersion("0.0.7", "0.0.7")).toBe(false);
  });

  it("is false for an unparseable version (never act on garbage)", () => {
    expect(isOlderVersion("nope", "0.0.8")).toBe(false);
  });
});

describe("ensureDaemonRunning", () => {
  it("takes the fast path without spawning when a daemon already answers", async () => {
    const spawn = vi.fn();
    const socket = { destroy: vi.fn() };
    const connect = vi.fn().mockResolvedValue(socket);
    await ensureDaemonRunning({
      host: "127.0.0.1",
      port: 8765,
      daemonEntry: "/x/cli.js",
      connect,
      spawn,
      sleep: async () => {},
    });
    expect(spawn).not.toHaveBeenCalled();
    // We only needed to know the daemon exists; the probe socket is closed.
    expect(socket.destroy).toHaveBeenCalledOnce();
  });

  it("spawns this bin as `serve` when no daemon answers, then polls until ready", async () => {
    const spawn = vi.fn();
    const socket = { destroy: vi.fn() };
    // First probe: nothing there. After the spawn + one poll: connected.
    const connect = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(socket);
    await ensureDaemonRunning({
      host: "127.0.0.1",
      port: 8765,
      daemonEntry: "/abs/cli.js",
      connect,
      spawn,
      sleep: async () => {},
      attempts: 5,
      intervalMs: 1,
    });
    expect(spawn).toHaveBeenCalledWith("/abs/cli.js", ["serve"]);
    expect(socket.destroy).toHaveBeenCalledOnce();
  });

  it("logs and returns without throwing when the daemon never comes up", async () => {
    const log = vi.fn();
    const connect = vi.fn().mockResolvedValue(null);
    await ensureDaemonRunning({
      host: "127.0.0.1",
      port: 8765,
      daemonEntry: "/abs/cli.js",
      connect,
      spawn: vi.fn(),
      sleep: async () => {},
      attempts: 3,
      intervalMs: 1,
      log,
    });
    expect(log).toHaveBeenCalledOnce();
  });

  it("falls back to the default stderr logger when none is injected", async () => {
    const write = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    try {
      // Omit `log` so the default stderr logger runs on the never-ready path.
      await ensureDaemonRunning({
        host: "127.0.0.1",
        port: 8765,
        daemonEntry: "/abs/cli.js",
        connect: vi.fn().mockResolvedValue(null),
        spawn: vi.fn(),
        sleep: async () => {},
        attempts: 1,
        intervalMs: 1,
      });
      expect(write).toHaveBeenCalledOnce();
    } finally {
      write.mockRestore();
    }
  });

  it("replaces a strictly older daemon: shuts it down, then spawns ours", async () => {
    const spawn = vi.fn();
    const shutdown = vi.fn().mockResolvedValue(true);
    const live = { destroy: vi.fn() };
    // Fast probe: a daemon is up. After shutdown: port frees (null). Then the
    // spawn's readiness poll: up again.
    const connect = vi
      .fn()
      .mockResolvedValueOnce(live) // fast path — a daemon answers
      .mockResolvedValueOnce(null) // port freed after shutdown
      .mockResolvedValueOnce({ destroy: vi.fn() }); // ours is ready
    await ensureDaemonRunning({
      host: "127.0.0.1",
      port: 8765,
      daemonEntry: "/abs/cli.js",
      connect,
      spawn,
      sleep: async () => {},
      attempts: 5,
      intervalMs: 1,
      selfVersion: "0.0.8",
      token: "t".repeat(40),
      readVersion: async () => "0.0.7",
      shutdown,
    });
    expect(shutdown).toHaveBeenCalledOnce();
    expect(spawn).toHaveBeenCalledWith("/abs/cli.js", ["serve"]);
  });

  it("leaves a same-or-newer daemon alone (never downgrades)", async () => {
    const spawn = vi.fn();
    const shutdown = vi.fn();
    const connect = vi.fn().mockResolvedValue({ destroy: vi.fn() });
    await ensureDaemonRunning({
      host: "127.0.0.1",
      port: 8765,
      daemonEntry: "/abs/cli.js",
      connect,
      spawn,
      sleep: async () => {},
      selfVersion: "0.0.7",
      token: "t".repeat(40),
      readVersion: async () => "0.0.8", // newer than us
      shutdown,
    });
    expect(shutdown).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });

  it("does not spawn when an old daemon refuses the shutdown (no /mcp/shutdown)", async () => {
    const spawn = vi.fn();
    const log = vi.fn();
    const connect = vi.fn().mockResolvedValue({ destroy: vi.fn() });
    await ensureDaemonRunning({
      host: "127.0.0.1",
      port: 8765,
      daemonEntry: "/abs/cli.js",
      connect,
      spawn,
      sleep: async () => {},
      selfVersion: "0.0.8",
      token: "t".repeat(40),
      readVersion: async () => "0.0.6",
      shutdown: async () => false, // predates the route
      log,
    });
    expect(spawn).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
  });

  it("skips reconciliation entirely when no selfVersion is given", async () => {
    const spawn = vi.fn();
    const readVersion = vi.fn();
    const connect = vi.fn().mockResolvedValue({ destroy: vi.fn() });
    await ensureDaemonRunning({
      host: "127.0.0.1",
      port: 8765,
      daemonEntry: "/abs/cli.js",
      connect,
      spawn,
      sleep: async () => {},
      readVersion,
    });
    expect(readVersion).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });

  it("uses the default probe against a real loopback listener (fast path)", async () => {
    const listener: NetServer = createServer();
    const port = await new Promise<number>((resolve) => {
      listener.listen(0, "127.0.0.1", () => {
        const addr = listener.address();
        resolve(typeof addr === "object" && addr ? addr.port : 0);
      });
    });
    const spawn = vi.fn();
    // Omit `connect`, `sleep`, `log`, `attempts`, `intervalMs` so their defaults
    // run: the real `tryConnect` connects to the live listener and returns fast.
    await ensureDaemonRunning({
      host: "127.0.0.1",
      port,
      daemonEntry: "/abs/cli.js",
      spawn,
    });
    expect(spawn).not.toHaveBeenCalled();
    await new Promise<void>((resolve) => listener.close(() => resolve()));
  });

  it("runs the real sleep once between polls", async () => {
    const socket = { destroy: vi.fn() };
    const connect = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(socket);
    // Omit `sleep` so the default `realSleep` executes for one short interval.
    await ensureDaemonRunning({
      host: "127.0.0.1",
      port: 8765,
      daemonEntry: "/abs/cli.js",
      connect,
      spawn: vi.fn(),
      attempts: 3,
      intervalMs: 1,
      log: () => {},
    });
    expect(socket.destroy).toHaveBeenCalledOnce();
  });
});

describe("runAdapter", () => {
  it("ensures a daemon, then connects the MCP server over the transport", async () => {
    const ensure = vi.fn().mockResolvedValue(undefined);
    const start = vi.fn().mockResolvedValue(undefined);
    // Minimal Transport surface the low-level Server drives on connect.
    const transport = {
      start,
      close: async () => {},
      send: async () => {},
    } as unknown as Parameters<typeof runAdapter>[0]["transport"];
    await runAdapter({
      host: "127.0.0.1",
      port: 8765,
      name: "t",
      version: "0",
      fetchImpl: jsonFetch({ jsonrpc: "2.0", id: 1, result: { tools: [] } }),
      ensure,
      transport,
    });
    expect(ensure).toHaveBeenCalledOnce();
    expect(start).toHaveBeenCalledOnce();
  });

  it("forwards a daemon catalog change to the host and tears down on transport close", async () => {
    const ensure = vi.fn().mockResolvedValue(undefined);
    const sent: Array<{ method?: string }> = [];
    const transport = {
      start: vi.fn().mockResolvedValue(undefined),
      close: async () => {},
      send: async (msg: { method?: string }) => {
        sent.push(msg);
      },
    } as unknown as Parameters<typeof runAdapter>[0]["transport"] & {
      onclose?: () => void;
    };
    let emit: ((data: string) => void) | null = null;
    let aborted = false;
    const subscribe: SubscribeImpl = async (_url, onEvent, signal) => {
      emit = onEvent;
      await new Promise<void>((resolve) => {
        if (signal.aborted) return resolve();
        signal.addEventListener("abort", () => {
          aborted = true;
          resolve();
        });
      });
    };
    await runAdapter({
      host: "127.0.0.1",
      port: 8765,
      name: "t",
      version: "0",
      fetchImpl: jsonFetch({ jsonrpc: "2.0", id: 1, result: { tools: [] } }),
      ensure,
      transport,
      subscribe,
    });
    // A tools_changed event forwards a list_changed notification to the host.
    emit?.(JSON.stringify({ type: "tools_changed" }));
    await new Promise((r) => setTimeout(r, 0));
    expect(
      sent.some((m) => m.method === "notifications/tools/list_changed"),
    ).toBe(true);
    // Closing the transport aborts the subscription loop.
    transport.onclose?.();
    await new Promise((r) => setTimeout(r, 0));
    expect(aborted).toBe(true);
  });
});
