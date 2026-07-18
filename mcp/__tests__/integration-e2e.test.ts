/**
 * Whole-stack mock e2e — many MCP hosts ↔ real adapters ↔ ONE real daemon ↔ a
 * fake side panel.
 *
 * Nothing on the critical path is stubbed but the browser. `runDaemon` (the real
 * process entry) brings up a genuine `node:http` daemon on a loopback port; each
 * "host" drives a real `createAdapterServer` whose handlers proxy over the real
 * global `fetch` to that daemon's `POST /mcp`; the daemon's bridge pushes work
 * down a real SSE stream to a fake panel that echoes it back. A crossed
 * correlation, a lost singleton, or a swallowed panel-closed error would all
 * surface here — the multi-host properties the daemon exists to hold, proven end
 * to end rather than per-module.
 *
 * This is the integration counterpart to the per-module suites: `adapter-e2e`
 * fakes the daemon, `mcp-server/e2e-daemon` fakes the adapter; this fakes
 * neither.
 */
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it, vi } from "vitest";
import { BRIDGE_USER_MESSAGES } from "@modootoday/extension-app-mcp-core";
import { runDaemon } from "@modootoday/extension-app-mcp-server";

import {
  createAdapterServer,
  ensureDaemonRunning,
  pushToolChanges,
} from "../src/adapter.js";

const TOKEN = "pairing-token-that-is-long-enough-32";
const EXT_ID = "abcdefghijklmnopabcdefghijklmnop";
const ORIGIN = `chrome-extension://${EXT_ID}`;

// Mirrors the real panel: identity is carried in the body, because the
// extension service worker's privileged loopback fetch sends no Origin header.
const GOOD_HELLO = {
  t: "hello",
  protocolVersions: [1],
  extensionVersion: "1.1.13",
  token: TOKEN,
  extensionId: EXT_ID,
};

/**
 * Two tools the fake panel reports, so a list assertion is not vacuous. Each
 * carries an `inputSchema` because the bridge validates the descriptor shape and
 * drops the whole frame otherwise (it forwards these to the host verbatim).
 */
const CATALOG = [
  {
    name: "keyword_trend",
    description: "trend",
    inputSchema: { type: "object" },
  },
  { name: "place_rank", description: "rank", inputSchema: { type: "object" } },
];

/** Real daemon boot + SSE round-trips need more than vitest's 5s default. */
const T = 20_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Grab a real free loopback port by binding, reading, and releasing it. */
async function freePort(): Promise<number> {
  const srv = createServer();
  await new Promise<void>((resolve) => srv.listen(0, "127.0.0.1", resolve));
  const port = (srv.address() as AddressInfo).port;
  await new Promise<void>((resolve) => srv.close(() => resolve()));
  return port;
}

interface Started {
  port: number;
  base: string;
  /** Ref-count owner, so the idle test can read live refs off the real daemon. */
  refs: () => number;
  exitCalls: number[];
}

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    const fn = cleanups.pop();
    if (fn) await fn().catch(() => {});
  }
});

/** Boot the real daemon on a fresh port; resolve once `/bridge/health` answers. */
async function start(idleMs?: number, version?: string): Promise<Started> {
  const port = await freePort();
  const exitCalls: number[] = [];
  const running = runDaemon(
    {
      DATALAB_MCP_TOKEN: TOKEN,
      DATALAB_MCP_EXTENSION_ID: EXT_ID,
      DATALAB_MCP_PORT: String(port),
      DATALAB_MCP_HOST: "127.0.0.1",
    },
    {
      log: () => {},
      exit: (code) => exitCalls.push(code),
      idleMs,
      // Lets a test pin the version /bridge/health reports (version reconcile).
      ...(version ? { version } : {}),
      // A short heartbeat flushes the SSE stream promptly so the panel round-trip
      // does not stall on undici's in-worker buffering (see the daemon dep doc).
      heartbeatMs: 25,
      // A wide bucket so the concurrency test is not throttled by the real
      // per-session limiter (that path is covered in the bridge suite).
      rateLimit: { capacity: 100, refillPerSecond: 100 },
    },
  );
  if (running === null) throw new Error("daemon failed to start");
  cleanups.push(() => running.http.close());

  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i += 1) {
    try {
      const res = await fetch(`${base}/bridge/health`);
      if (res.ok) {
        await res.text();
        return {
          port,
          base,
          refs: () => running.lifecycle.refs,
          exitCalls,
        };
      }
    } catch {
      // not listening yet
    }
    await sleep(10);
  }
  throw new Error("daemon did not answer /bridge/health in time");
}

/**
 * Stand in for the extension: read the SSE stream, report the catalog on a
 * list, and echo the args on a call so a caller can prove a reply is its own.
 */
async function attachPanel(
  base: string,
  tools: unknown[] = CATALOG,
): Promise<() => Promise<void>> {
  // No origin header — the real service-worker fetch omits it, so the daemon
  // identifies the panel from the body id instead.
  await fetch(`${base}/bridge/hello`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(GOOD_HELLO),
  });
  // The SSE fetch is bound to an AbortController so detach() can destroy the
  // socket deterministically. reader.cancel() alone leaves the connection in
  // undici's pool, so the daemon never sees the disconnect and never releases
  // the ref — which the idle-reclaim assertion depends on.
  const controller = new AbortController();
  const res = await fetch(`${base}/bridge/events`, {
    headers: { origin: ORIGIN },
    signal: controller.signal,
  });
  expect(res.status).toBe(200);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  const pump = (async () => {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const raw = buf.slice(0, idx).replace(/^data: /, "");
        buf = buf.slice(idx + 2);
        const frame = JSON.parse(raw) as Record<string, unknown>;
        if (frame.t === "hb") continue;
        const reply =
          frame.method === "tools/list"
            ? { t: "tools", id: frame.id, tools }
            : { t: "res", id: frame.id, ok: true, result: frame.args };
        // A result posted just as the daemon is torn down (cleanup or idle-exit)
        // would otherwise surface as an unhandled ECONNREFUSED; swallow it — the
        // panel is a fake and its writes are best-effort.
        await fetch(`${base}/bridge/result`, {
          method: "POST",
          headers: { origin: ORIGIN, "content-type": "application/json" },
          body: JSON.stringify(reply),
        }).catch(() => {});
      }
    }
  })();

  return async () => {
    controller.abort();
    await pump.catch(() => {});
  };
}

type Handler = (req: unknown, extra: unknown) => Promise<unknown>;

/** A distinct MCP host: its own real adapter server bound to the daemon's port. */
function makeHost(port: number): {
  list: () => Promise<{ tools: Array<{ name: string }> }>;
  call: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ content: Array<{ text: string }>; isError?: boolean }>;
} {
  const server = createAdapterServer({ host: "127.0.0.1", port });
  const handlers = (
    server as unknown as { _requestHandlers: Map<string, Handler> }
  )._requestHandlers;
  return {
    list: () =>
      handlers.get("tools/list")!({ method: "tools/list" }, {}) as Promise<{
        tools: Array<{ name: string }>;
      }>,
    call: (name, args) =>
      handlers.get("tools/call")!(
        { method: "tools/call", params: { name, arguments: args } },
        {},
      ) as Promise<{ content: Array<{ text: string }>; isError?: boolean }>,
  };
}

describe("whole-stack mock e2e: hosts ↔ adapters ↔ one daemon ↔ fake panel", () => {
  it(
    "routes list + call from several hosts through one daemon to the panel",
    async () => {
      const { port, base } = await start();
      const detach = await attachPanel(base);

      const hostA = makeHost(port);
      const hostB = makeHost(port);

      // Both hosts see the panel's catalog — the daemon serves them the same list.
      expect((await hostA.list()).tools.map((t) => t.name)).toEqual([
        "keyword_trend",
        "place_rank",
      ]);
      expect((await hostB.list()).tools.map((t) => t.name)).toEqual([
        "keyword_trend",
        "place_rank",
      ]);

      // Each host's call is echoed with its own args.
      const a = await hostA.call("keyword_trend", { kw: "seoul" });
      const b = await hostB.call("place_rank", { id: 42 });
      expect(JSON.parse(a.content[0].text)).toEqual({ kw: "seoul" });
      expect(JSON.parse(b.content[0].text)).toEqual({ id: 42 });

      await detach();
    },
    T,
  );

  it(
    "keeps per-call correlation clean under concurrency across hosts",
    async () => {
      const { port, base } = await start();
      const detach = await attachPanel(base);

      const N = 12;
      // A fresh host per call so the crossing, if any, is across adapters too.
      const results = await Promise.all(
        Array.from({ length: N }, (_, i) =>
          makeHost(port).call("keyword_trend", { seq: i }),
        ),
      );
      for (let i = 0; i < N; i += 1) {
        expect(JSON.parse(results[i].content[0].text)).toEqual({ seq: i });
      }

      await detach();
    },
    T,
  );

  it(
    "does not spawn a second daemon when one already owns the port (singleton)",
    async () => {
      const { port } = await start();
      let spawned = 0;
      // Real `tryConnect` against the live port — only `spawn` is a spy. A daemon
      // is up, so the fast path must connect and return without spawning.
      await ensureDaemonRunning({
        host: "127.0.0.1",
        port,
        spawn: () => {
          spawned += 1;
        },
        log: () => {},
      });
      expect(spawned).toBe(0);
    },
    T,
  );

  it(
    "surfaces the panel-closed guidance as an agent-actionable isError result when no panel is attached",
    async () => {
      const { port } = await start();
      // No attachPanel — the daemon has no browser. A call must RESOLVE with an
      // isError tool result (the model reads and acts on it), not reject as a
      // protocol error — that is how the agent learns to open the panel + retry.
      const host = makeHost(port);
      const result = await host.call("keyword_trend", {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        BRIDGE_USER_MESSAGES.panelClosed,
      );
    },
    T,
  );

  it(
    "serves a Cursor-style direct /mcp client (no adapter) on the same daemon",
    async () => {
      const { base } = await start();
      const detach = await attachPanel(base);

      const post = (accept: string): Promise<Response> =>
        fetch(`${base}/mcp`, {
          method: "POST",
          headers: { "content-type": "application/json", accept },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 7,
            method: "tools/call",
            params: { name: "keyword_trend", arguments: { direct: true } },
          }),
        });

      // Plain JSON negotiation.
      const jsonRes = await post("application/json");
      expect(jsonRes.headers.get("content-type")).toBe("application/json");
      const jsonBody = (await jsonRes.json()) as {
        result: { content: Array<{ text: string }> };
      };
      expect(JSON.parse(jsonBody.result.content[0].text)).toEqual({
        direct: true,
      });

      // Streamable-HTTP negotiation — the daemon frames one SSE data event.
      const sseRes = await post("text/event-stream");
      expect(sseRes.headers.get("content-type")).toBe("text/event-stream");
      const sseText = await sseRes.text();
      expect(sseText.startsWith("data: ")).toBe(true);
      const framed = JSON.parse(sseText.slice("data: ".length)) as {
        result: { content: Array<{ text: string }> };
      };
      expect(JSON.parse(framed.result.content[0].text)).toEqual({
        direct: true,
      });

      await detach();
    },
    T,
  );

  it(
    "pushes tools/list_changed to the host as the panel connects and drops",
    async () => {
      // The real /mcp/notifications SSE drives pushToolChanges over real fetch;
      // notifyHost stands in for the host receiving
      // notifications/tools/list_changed.
      const { port, base } = await start();
      const notifyHost = vi.fn().mockResolvedValue(undefined);
      const controller = new AbortController();
      void pushToolChanges({
        mcpUrl: `http://127.0.0.1:${port}/mcp`,
        notifyHost,
        signal: controller.signal,
      });

      const waitFor = async (n: number): Promise<void> => {
        for (let i = 0; i < 200 && notifyHost.mock.calls.length < n; i += 1) {
          await sleep(10);
        }
      };

      // Immediate event on subscribe (covers "adapter connected before panel").
      await waitFor(1);
      const detach = await attachPanel(base); // panel connects → re-fetch
      await waitFor(2);
      await detach(); // panel drops → re-fetch (the "restore" signal)
      await waitFor(3);

      controller.abort();
      expect(notifyHost.mock.calls.length).toBeGreaterThanOrEqual(3);
    },
    T,
  );

  it(
    "holds the idle window open while a panel is connected, then reclaims after it drops",
    async () => {
      const idleMs = 200;
      const daemon = await start(idleMs);
      const detach = await attachPanel(daemon.base);

      // The panel's SSE stream holds a ref, so the idle timer stays cancelled even
      // well past the window — no mid-session reclaim.
      expect(daemon.refs()).toBeGreaterThanOrEqual(1);
      await sleep(idleMs * 2);
      expect(daemon.exitCalls).toEqual([]);
      expect(daemon.refs()).toBeGreaterThanOrEqual(1);

      // Panel drops → refs fall to zero → the window arms → the daemon exits 0.
      await detach();
      for (let i = 0; i < 50 && daemon.exitCalls.length === 0; i += 1) {
        await sleep(idleMs / 4);
      }
      expect(daemon.exitCalls).toContain(0);
    },
    T,
  );

  it(
    "replaces a stale older daemon on adapter start via the real shutdown route",
    async () => {
      // A real daemon reporting an OLD version still holds the port after an
      // update. A newer adapter must shut it down (real POST /mcp/shutdown) and
      // spawn the replacement — here the spawn is the only stub.
      const daemon = await start(undefined, "0.0.1");
      const spawn = vi.fn();
      await ensureDaemonRunning({
        host: "127.0.0.1",
        port: daemon.port,
        daemonEntry: "/unused/cli.js",
        spawn,
        sleep: (ms) => sleep(ms),
        attempts: 30,
        intervalMs: 20,
        selfVersion: "0.0.2",
        token: TOKEN,
      });

      // The real old daemon received the shutdown and exited.
      expect(daemon.exitCalls).toContain(0);
      // And we would have brought the replacement up.
      expect(spawn).toHaveBeenCalledWith("/unused/cli.js", ["serve"]);
    },
    T,
  );
});
