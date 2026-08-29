/**
 * Adapter unit tests with every edge injected: the readiness probe, the spawn,
 * and the fetch are stubbed so each branch is asserted in isolation. One
 * fast-path test uses a real loopback listener to exercise the default probe.
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

  /**
   * Never degrade to an empty list. Many hosts ignore list-changed
   * notifications and cache the first list they receive, so an empty one here
   * freezes that host until it is restarted — and it also makes a fault
   * indistinguishable from a connector that simply has no tools.
   */
  it("raises a daemon error instead of freezing the host on an empty list", async () => {
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
    ).rejects.toThrow("boom");
  });

  /**
   * The daemon idle-exits by design, so nothing listening is an ordinary
   * state rather than a fault — the same one a tool call answers by bringing it
   * back. Asking for the catalog used to answer "no connector" instead, and a
   * host that caches the first list it receives never asks again.
   */
  it("brings the connector back and retries instead of failing", async () => {
    const revive = vi.fn(async () => {});
    let attempt = 0;
    const server = createAdapterServer({
      fetchImpl: async () => {
        attempt += 1;
        if (attempt === 1) throw new Error("socket gone");
        return {
          text: async () =>
            JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              result: { tools: [{ name: "keyword_trend" }] },
            }),
        };
      },
      revive,
      log: () => {},
    });
    await expect(
      handlers(server).get("tools/list")!({ method: "tools/list" }, {}),
    ).resolves.toEqual({ tools: [{ name: "keyword_trend" }] });
    expect(revive).toHaveBeenCalledOnce();
  });

  /**
   * A host holding no tools at all cannot ask for them again — these names
   * are how everything else is reached, so a connector that will not come back
   * still has to leave them behind. Calling one says the connector is down, and
   * that message has somewhere for the user to go.
   */
  it("serves the façade rather than leaving the host with nothing", async () => {
    const server = createAdapterServer({
      fetchImpl: () => Promise.reject(new Error("socket gone")),
      revive: async () => {
        throw new Error("spawn refused");
      },
      log: () => {},
    });
    const out = (await handlers(server).get("tools/list")!(
      { method: "tools/list" },
      {},
    )) as { tools: { name: string }[] };
    const names = out.tools.map((t) => t.name);
    // The whole surface, not the discovery half. A caching host keeps what
    // it is handed, so a short list costs it those tools for the session as
    // surely as an empty one costs it all of them.
    expect(names).toEqual([
      "datalab_find_tools",
      "datalab_list_tools",
      "datalab_call",
      "datalab_confirm_status",
      "datalab_session_state",
      "datalab_browsers",
      "media_stage_begin",
      "media_stage_commit",
      "media_stage_status",
      "media_stage_cancel",
    ]);
  });

  it("한 번 shaped 된 오류를 다시 감싸지 않는다 — 메시지가 묻히지 않게", async () => {
    const server = createAdapterServer({
      fetchImpl: jsonFetch({
        jsonrpc: "2.0",
        id: 1,
        error: { code: -32603, message: "정확히 이 문장" },
      }),
      log: () => {},
    });
    await expect(
      handlers(server).get("tools/list")!({ method: "tools/list" }, {}),
    ).rejects.toThrow("정확히 이 문장");
  });

  it("정상 목록은 그대로 통과시킨다", async () => {
    const tools = [
      { name: "keyword_trend", description: "d", inputSchema: {} },
    ];
    const server = createAdapterServer({
      fetchImpl: jsonFetch({ jsonrpc: "2.0", id: 1, result: { tools } }),
      log: () => {},
    });
    await expect(
      handlers(server).get("tools/list")!({ method: "tools/list" }, {}),
    ).resolves.toEqual({ tools });
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
    // A frozen, user-actionable message, not a bare protocol error.
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
    // Repeated fast failures with a clock that never advances, so nothing
    // resets and the delay grows until it caps. Randomness is pinned to the top
    // of each window for a deterministic assertion.
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
    // Each subscription holds past the base interval before dropping, so the
    // backoff resets every time.
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
    // Only its existence was needed, so the probe socket is closed.
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
      // The logger is omitted so its default runs on the never-ready path.
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
      checkAuthority: async () => true,
      // Injected even where the path is not taken: relying on the runner
      // interlock is how a harness ends up pointed at the real port.
      killOwner: () => false,
      shutdown,
    });
    expect(shutdown).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });

  it("fails closed when an old daemon refuses this authority", async () => {
    const spawn = vi.fn();
    const log = vi.fn();
    const connect = vi.fn().mockResolvedValue({ destroy: vi.fn() });
    await expect(
      ensureDaemonRunning({
        host: "127.0.0.1",
        port: 8765,
        daemonEntry: "/abs/cli.js",
        connect,
        spawn,
        sleep: async () => {},
        selfVersion: "0.0.8",
        token: "t".repeat(40),
        readVersion: async () => "0.0.6",
        shutdown: async () => false,
        log,
      }),
    ).rejects.toThrow(/authority conflict/);
    expect(spawn).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
  });

  /**
   * No takeover file means the holder predates it. `readTakeover` is injected
   * rather than left to the real one: without it this reads the developer's
   * own home directory, and a connector running there would decide the result.
   */
  it("fails closed when a same-version daemon belongs to another workbench", async () => {
    const connect = vi.fn().mockResolvedValue({ destroy: vi.fn() });
    const spawn = vi.fn();
    await expect(
      ensureDaemonRunning({
        host: "127.0.0.1",
        port: 8765,
        daemonEntry: "/abs/cli.js",
        connect,
        spawn,
        sleep: async () => {},
        selfVersion: "0.0.8",
        token: "a".repeat(40),
        readVersion: async () => "0.0.8",
        checkAuthority: async () => false,
        readTakeover: () => null,
        killOwner: () => false,
      }),
    ).rejects.toThrow(/Quit every AI app/);
    expect(spawn).not.toHaveBeenCalled();
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
    // The probe and pacing deps are omitted so their defaults run against the
    // live listener.
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
    // Sleep is omitted so its default executes for one short interval.
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
      // Not the subject here — promotion has its own suite.
      selfUpdate: false,
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
      // Not the subject here — promotion has its own suite.
      selfUpdate: false,
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

describe("유휴 종료된 데몬 되살리기", () => {
  const CALL = "tools/call";

  /** A fetch that fails the first N calls with a connect error, then answers. */
  function failThenAnswer(n: number, calls: { count: number }): FetchImpl {
    return async () => {
      calls.count += 1;
      if (calls.count <= n) throw new Error("connect ECONNREFUSED");
      return {
        text: async () =>
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            result: { content: [{ type: "text", text: "ok" }] },
          }),
      };
    };
  }

  it("호출이 연결에 실패하면 데몬을 되살리고 한 번 재시도한다", async () => {
    const calls = { count: 0 };
    const revive = vi.fn(async () => {});
    const server = createAdapterServer({
      fetchImpl: failThenAnswer(1, calls),
      revive,
      log: () => {},
    });
    const handler = handlers(server).get(CALL);
    const out = (await handler?.(
      {
        method: "tools/call",
        params: { name: "search_blog", arguments: {} },
      },
      {},
    )) as { isError?: boolean; content?: { text?: string }[] };

    expect(revive).toHaveBeenCalledTimes(1);
    expect(calls.count).toBe(2);
    expect(out.isError).toBeUndefined();
    expect(out.content?.[0]?.text).toBe("ok");
  });

  it("시간초과에는 되살리지 않는다 — 데몬은 살아 있고 늦게 답한 것이다", async () => {
    const revive = vi.fn(async () => {});
    const timeout = Object.assign(new Error("aborted"), { name: "AbortError" });
    const server = createAdapterServer({
      fetchImpl: async () => {
        throw timeout;
      },
      revive,
      log: () => {},
    });
    const handler = handlers(server).get(CALL);
    const out = (await handler?.(
      {
        method: "tools/call",
        params: { name: "search_blog", arguments: {} },
      },
      {},
    )) as { isError?: boolean };

    expect(revive).not.toHaveBeenCalled();
    expect(out.isError).toBe(true);
  });

  it("되살린 뒤에도 실패하면 한 번만 시도하고 안내를 돌려준다", async () => {
    const calls = { count: 0 };
    const revive = vi.fn(async () => {});
    const server = createAdapterServer({
      fetchImpl: failThenAnswer(99, calls),
      revive,
      log: () => {},
    });
    const handler = handlers(server).get(CALL);
    const out = (await handler?.(
      {
        method: "tools/call",
        params: { name: "search_blog", arguments: {} },
      },
      {},
    )) as { isError?: boolean };

    expect(revive).toHaveBeenCalledTimes(1);
    expect(calls.count).toBe(2); // 최초 + 재시도 1회. 무한 재시도 아님
    expect(out.isError).toBe(true);
  });

  it("구독이 연속으로 못 열리면 데몬을 되살린다", async () => {
    const revive = vi.fn(async () => {});
    const ctl = new AbortController();
    let attempts = 0;
    const subscribe: SubscribeImpl = async () => {
      attempts += 1;
      if (attempts >= 6) ctl.abort();
      throw new Error("connect ECONNREFUSED");
    };
    await pushToolChanges({
      mcpUrl: "http://127.0.0.1:1/mcp",
      notifyHost: async () => {},
      subscribe,
      sleep: async () => {},
      signal: ctl.signal,
      revive,
      rng: () => 0,
      now: () => 0, // 항상 즉시 실패 = 연결 자체가 안 열림
      log: () => {},
    });
    expect(revive).toHaveBeenCalled();
  });
});
