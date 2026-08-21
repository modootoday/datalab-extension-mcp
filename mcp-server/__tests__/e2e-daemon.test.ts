/**
 * A fake side panel against the real bridge and HTTP server, driving many MCP
 * clients at once. Nothing is stubbed but the browser, and the panel echoes
 * each call's args so a crossed correlation shows up as a mismatched echo —
 * the multi-host property the daemon exists to hold.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BRIDGE_USER_MESSAGES,
  REQUIRED_BROWSER_CAPABILITIES,
} from "@modootoday/extension-app-mcp-core";
import type { AddressInfo } from "node:net";

import { Bridge } from "../src/bridge.js";
import { createHttpBridge, type HttpBridge } from "../src/http.js";
import { bindAsLock } from "../src/singleton.js";

const TOKEN = "pairing-token-that-is-long-enough-32";
/** One key per machine: what a browser presents is the pairing token itself. */
const BROWSER_TOKEN = TOKEN;
const EXT_ID = "abcdefghijklmnopabcdefghijklmnop";
const ORIGIN = `chrome-extension://${EXT_ID}`;

// Mirrors the real panel: identity travels in the body, because the extension
// service worker's privileged loopback fetch sends no Origin header.
const GOOD_HELLO = {
  t: "hello",
  protocolVersions: [1],
  extensionVersion: "1.1.13",
  token: BROWSER_TOKEN,
  extensionId: EXT_ID,
  browserId: "brw-a",
  capabilities: [...REQUIRED_BROWSER_CAPABILITIES],
};

describe("mock e2e: many MCP clients ↔ one daemon ↔ fake panel", () => {
  let bridge: Bridge;
  let http: HttpBridge;
  let base: string;
  let boundPort: number;
  let shutdownCount: number;
  let refs: number;

  beforeEach(async () => {
    shutdownCount = 0;
    bridge = new Bridge({
      // The delivery result is returned as is. Swallowing it makes the
      // bridge read every frame as having reached nobody, so a connected panel
      // gets an immediate not-connected failure.
      send: (frame, key) => http.send(frame, key),
      token: TOKEN,
      extensionIds: [EXT_ID],
      serverVersion: "0.0.1-test",
      // A generous bucket so the concurrency test is not throttled by the rate
      // limiter, which has its own coverage elsewhere.
      rateLimit: { capacity: 100, refillPerSecond: 100 },
    });
    refs = 0;
    http = createHttpBridge({
      bridge,
      port: 0,
      heartbeatMs: 50,
      identity: { name: "datalab-extension-mcp-server", version: "0.0.0-test" },
      lifecycle: {
        retain: () => {
          refs += 1;
        },
        release: () => {
          refs -= 1;
        },
        bump: () => {},
      },
      onShutdown: () => {
        shutdownCount += 1;
      },
    });
    await new Promise<void>((resolve) =>
      http.server.listen(0, "127.0.0.1", resolve),
    );
    boundPort = (http.server.address() as AddressInfo).port;
    base = `http://127.0.0.1:${boundPort}`;
  });

  afterEach(async () => {
    await http.close();
  });

  // No Origin header on purpose, so this exercises the body-id identity path a
  // real device uses.
  const hello = (): Promise<Response> =>
    fetch(`${base}/bridge/hello`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(GOOD_HELLO),
    });

  /** Stands in for the extension: reads the stream, echoes args, posts results. */
  async function attachPanel(): Promise<() => Promise<void>> {
    const ack = (await (await hello()).json()) as { sessionId: string };
    const res = await fetch(`${base}/bridge/events?session=${ack.sessionId}`, {
      headers: {
        origin: ORIGIN,
        authorization: `Bearer ${BROWSER_TOKEN}`,
      },
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
              ? {
                  t: "tools",
                  id: frame.id,
                  tools: [],
                  route: { browserId: "brw-a" },
                }
              : {
                  // Echoed straight back so a caller can prove the reply is
                  // its own.
                  t: "res",
                  id: frame.id,
                  ok: true,
                  result: frame.args,
                  route: { browserId: "brw-a" },
                };
          await fetch(`${base}/bridge/result`, {
            method: "POST",
            headers: {
              origin: ORIGIN,
              authorization: `Bearer ${BROWSER_TOKEN}`,
              "content-type": "application/json",
            },
            body: JSON.stringify(reply),
          });
        }
      }
    })();

    return async () => {
      await reader.cancel().catch(() => {});
      await pump.catch(() => {});
    };
  }

  /** One JSON-RPC tool call over the MCP route, decoded. */
  async function mcpCall(
    id: number,
    args: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: { name: "keyword_trend", arguments: args },
      }),
    });
    expect(res.headers.get("content-type")).toBe("application/json");
    return (await res.json()) as Record<string, unknown>;
  }

  it("settles N concurrent tools/call with correct per-request correlation", async () => {
    const detach = await attachPanel();
    const N = 8;

    const envelopes = await Promise.all(
      Array.from({ length: N }, (_, i) => mcpCall(i, { seq: i })),
    );

    for (let i = 0; i < N; i += 1) {
      const env = envelopes[i];
      expect(env.id).toBe(i);
      const result = env.result as { content: Array<{ text: string }> };
      // The echoed sequence must match this request's own.
      expect(JSON.parse(result.content[0].text)).toEqual({ seq: i });
    }

    await detach();
  });

  it("fails a call with an agent-actionable isError result when no panel is connected", async () => {
    const env = await mcpCall(1, {});
    // With no panel, the recoverable failure rides the isError result
    // channel the model acts on, not a JSON-RPC protocol error.
    expect(env.error).toBeUndefined();
    const result = env.result as {
      content: Array<{ text: string }>;
      isError: boolean;
    };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(BRIDGE_USER_MESSAGES.panelClosed);
  });

  it("reuses the daemon only for the exact workbench authority", async () => {
    const probe = (token: string): Promise<Response> =>
      fetch(`${base}/mcp/authority`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });

    expect((await probe(TOKEN)).status).toBe(204);
    expect(
      (await probe("another-workbench-token-that-is-long-enough")).status,
    ).toBe(403);
  });

  it("replaces only a handshake that never opened its stream", async () => {
    const ackA = (await (await hello()).json()) as { sessionId: string };
    const ackB = (await (await hello()).json()) as { sessionId: string };
    expect(ackA.sessionId).not.toBe(ackB.sessionId);

    const resA = await fetch(
      `${base}/bridge/events?session=${ackA.sessionId}`,
      {
        headers: {
          origin: ORIGIN,
          authorization: `Bearer ${BROWSER_TOKEN}`,
        },
      },
    );
    // Ended rather than refused: the panel already treats an ended stream as a
    // reason to handshake again, which is exactly what it must do here. Read
    // rather than drain, so a stream that stayed open fails on the heartbeat
    // instead of hanging until the suite gives up.
    const readerA = resA.body!.getReader();
    expect((await readerA.read()).done).toBe(true);

    const resB = await fetch(
      `${base}/bridge/events?session=${ackB.sessionId}`,
      {
        headers: {
          origin: ORIGIN,
          authorization: `Bearer ${BROWSER_TOKEN}`,
        },
      },
    );
    expect(resB.status).toBe(200);
    // The live session got the stream, so a call now reaches somebody.
    const reader = resB.body!.getReader();
    await reader.cancel();
  });

  it("rejects a replacement hello while the incumbent stream is active", async () => {
    const detachOld = await attachPanel();
    expect(refs).toBe(1);
    const response = await hello();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      t: "hello_nack",
      reason: "session_active",
    });
    expect(refs).toBe(1);
    await detachOld();
  });

  it("rejects a panel that names no session", async () => {
    await hello();
    const res = await fetch(`${base}/bridge/events`, {
      headers: {
        origin: ORIGIN,
        authorization: `Bearer ${BROWSER_TOKEN}`,
      },
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "session_required" });
  });

  it("a panel reload waits for the incumbent stream to detach", async () => {
    const detachOld = await attachPanel();
    const replacement = await hello();
    expect(replacement.status).toBe(403);
    expect(await replacement.json()).toMatchObject({
      t: "hello_nack",
      reason: "session_active",
    });
    expect(bridge.connected).toBe(true);
    await detachOld();
    await vi.waitFor(() => expect(bridge.connected).toBe(false));
  });

  /** Post a raw hello with an explicit origin and body, parsed back. */
  async function rawHello(
    origin: string | undefined,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`${base}/bridge/hello`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(origin ? { origin } : {}),
      },
      body: JSON.stringify(body),
    });
    return (await res.json()) as Record<string, unknown>;
  }

  it("requires a registered browser id even with a valid Origin", async () => {
    const noId: Record<string, unknown> = { ...GOOD_HELLO };
    delete noId.extensionId;
    delete noId.browserId;
    const frame = await rawHello(ORIGIN, noId);
    expect(frame).toMatchObject({
      t: "hello_nack",
      reason: "unauthorized",
    });
  });

  it("rejects a mismatched body id when no Origin is present", async () => {
    const frame = await rawHello(undefined, {
      ...GOOD_HELLO,
      extensionId: "someotherextensionidhere00000000",
    });
    expect(frame).toMatchObject({
      t: "hello_nack",
      reason: "forbidden_origin",
    });
  });

  it("rejects a hello with neither an Origin nor a body id", async () => {
    const noId: Record<string, unknown> = { ...GOOD_HELLO };
    delete noId.extensionId;
    const frame = await rawHello(undefined, noId);
    expect(frame).toMatchObject({
      t: "hello_nack",
      reason: "forbidden_origin",
    });
  });

  it("pushes tools_changed to a subscriber on subscribe, panel connect, and drop", async () => {
    const events: string[] = [];
    const controller = new AbortController();
    const res = await fetch(`${base}/mcp/notifications`, {
      signal: controller.signal,
    });
    expect(res.headers.get("content-type")).toBe("text/event-stream");

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
          const raw = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          if (raw.startsWith("data: ")) events.push(raw.slice(6));
        }
      }
    })();

    const waitFor = async (n: number): Promise<void> => {
      for (let i = 0; i < 100 && events.length < n; i += 1) {
        await new Promise((r) => setTimeout(r, 10));
      }
    };

    // The immediate event on subscribe, covering an adapter that connected
    // before the panel was up.
    await waitFor(1);
    const detach = await attachPanel(); // panel connects → event
    await waitFor(2);
    await detach(); // panel drops → event
    await waitFor(3);

    controller.abort();
    await pump.catch(() => {});

    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(events.every((e) => JSON.parse(e).type === "tools_changed")).toBe(
      true,
    );
  });

  it("steps aside on a token-authorised POST /mcp/shutdown", async () => {
    const res = await fetch(`${base}/mcp/shutdown`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: TOKEN }),
    });
    expect(res.status).toBe(200);
    expect(shutdownCount).toBe(1);
  });

  it("refuses a shutdown with a wrong or missing token", async () => {
    const wrong = await fetch(`${base}/mcp/shutdown`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "not-the-pairing-token-but-long-enough" }),
    });
    expect(wrong.status).toBe(403);

    const none = await fetch(`${base}/mcp/shutdown`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(none.status).toBe(403);
    // A rejected shutdown must never fire the hook.
    expect(shutdownCount).toBe(0);
  });

  it("exercises the bindAsLock exit-0 path when a second bind hits the live port", async () => {
    // A second daemon racing for the port must take the already-taken path,
    // never the listening one.
    const secondBridge = new Bridge({
      send: () => false,
      token: TOKEN,
      extensionIds: [EXT_ID],
      serverVersion: "0.0.1-test",
    });
    const second = createHttpBridge({
      bridge: secondBridge,
      port: boundPort,
      identity: { name: "datalab-extension-mcp-server", version: "0.0.0-test" },
    });
    try {
      const outcome = await new Promise<"listen" | "taken">((resolve) => {
        bindAsLock(
          second.server,
          boundPort,
          "127.0.0.1",
          () => resolve("listen"),
          () => resolve("taken"),
        );
      });
      expect(outcome).toBe("taken");
    } finally {
      await second.close();
    }
  });
});
