/**
 * Two claimed browsers against the real HTTP server.
 * Each credential, stream, and addressed request remains browser-owned.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BROWSER_ROUTING_CAPABILITY,
  BRIDGE_AUTH_CAPABILITY,
  LOCAL_FILE_REQUEST_CAPABILITY,
} from "@modootoday/extension-app-mcp-core";

import { Bridge } from "../src/bridge.js";
import { createHttpBridge, type HttpBridge } from "../src/http.js";

const ROOT = "pairing-token-that-is-long-enough-32";
const EXT_ID = "abcdefghijklmnopabcdefghijklmnop";
const ORIGIN = `chrome-extension://${EXT_ID}`;

const tokenFor = (_browserId: string): string => ROOT;

const helloBody = (browserId: string) => ({
  t: "hello",
  protocolVersions: [1],
  extensionVersion: "1.1.13",
  token: tokenFor(browserId),
  extensionId: EXT_ID,
  browserId,
  browserLabel: browserId === "brw-a" ? "A" : "B",
  capabilities: [
    BRIDGE_AUTH_CAPABILITY,
    BROWSER_ROUTING_CAPABILITY,
    LOCAL_FILE_REQUEST_CAPABILITY,
  ],
});

interface Panel {
  sessionId: string;
  /** Frames that arrived on this stream, heartbeats dropped. */
  frames: Record<string, unknown>[];
  status: number;
  close: () => Promise<void>;
}

describe("두 브라우저, 두 스트림", () => {
  let bridge: Bridge;
  let http: HttpBridge;
  let base: string;
  let refs: number;

  beforeEach(async () => {
    refs = 0;
    bridge = new Bridge({
      send: (frame, key) => http.send(frame, key),
      token: ROOT,
      extensionIds: [EXT_ID],
      serverVersion: "0.0.1-test",
      rateLimit: { capacity: 100, refillPerSecond: 100 },
    });
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
    });
    await new Promise<void>((resolve) =>
      http.server.listen(0, "127.0.0.1", resolve),
    );
    base = `http://127.0.0.1:${(http.server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    await http.close();
  });

  const handshake = async (browserId: string): Promise<string> => {
    const res = await fetch(`${base}/bridge/hello`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(helloBody(browserId)),
    });
    const ack = (await res.json()) as { t: string; sessionId: string };
    expect(ack.t).toBe("hello_ack");
    return ack.sessionId;
  };

  const rawHandshake = async (
    browserId: string,
  ): Promise<Record<string, unknown>> => {
    const res = await fetch(`${base}/bridge/hello`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(helloBody(browserId)),
    });
    return (await res.json()) as Record<string, unknown>;
  };

  /** Opens a stream and records what lands on it. Never answers. */
  async function openPanel(browserId: string): Promise<Panel> {
    const sessionId = await handshake(browserId);
    const res = await fetch(
      `${base}/bridge/events?session=${encodeURIComponent(sessionId)}`,
      {
        headers: {
          origin: ORIGIN,
          authorization: `Bearer ${tokenFor(browserId)}`,
        },
      },
    );
    const frames: Record<string, unknown>[] = [];
    if (res.status !== 200 || !res.body) {
      return { sessionId, frames, status: res.status, close: async () => {} };
    }
    const reader = res.body.getReader();
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
          if (frame.t !== "hb") frames.push(frame);
        }
      }
    })();
    return {
      sessionId,
      frames,
      status: res.status,
      close: async () => {
        await reader.cancel().catch(() => {});
        await pump.catch(() => {});
      },
    };
  }

  const settle = (): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, 60));

  it("두 브라우저의 스트림이 공존한다 — 남의 것은 중복이 아니다", async () => {
    const a = await openPanel("brw-a");
    const b = await openPanel("brw-b");
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(refs).toBe(2);
    await a.close();
    await b.close();
  });

  it("뒤에 온 브라우저의 핸드셰이크가 앞선 스트림을 끊지 않는다", async () => {
    const a = await openPanel("brw-a");
    await handshake("brw-b");
    await settle();

    // Still ours: a frame for A arrives, which a torn-down stream could not do.
    void bridge.callTool("keyword_trend", { probe: 1 }).catch(() => {});
    await settle();
    expect(a.frames.map((f) => f.method)).toEqual(["tools/call"]);
    await a.close();
  });

  it("앞선 브라우저의 요청 프레임이 뒤 브라우저의 스트림에 가지 않는다", async () => {
    const a = await openPanel("brw-a");
    const b = await openPanel("brw-b");

    void bridge.callTool("keyword_trend", { probe: 2 }).catch(() => {});
    await settle();

    expect(a.frames).toHaveLength(1);
    expect(b.frames).toHaveLength(0);
    await a.close();
    await b.close();
  });

  it("sends an addressed request only to the selected browser", async () => {
    const a = await openPanel("brw-a");
    const b = await openPanel("brw-b");

    void bridge
      .callTool("editor_insert_image", { path: "/private/image.png" }, "brw-b")
      .catch(() => {});
    await settle();

    expect(a.frames).toHaveLength(0);
    expect(b.frames).toHaveLength(1);
    expect(b.frames[0]?.method).toBe("tools/call");
    await a.close();
    await b.close();
  });

  it("uses only browser B session tickets for both local-file tools", async () => {
    const dir = await mkdtemp(join(tmpdir(), "two-browser-file-"));
    const path = join(dir, "image.png");
    await writeFile(
      path,
      Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        Buffer.from("image"),
      ]),
    );
    const a = await openPanel("brw-a");
    const b = await openPanel("brw-b");
    const calls: Array<Promise<unknown>> = [];

    for (const tool of ["editor_insert_image", "gallery_image_add"] as const) {
      calls.push(
        bridge.callTool(tool, { path }, "brw-b").catch(() => undefined),
      );
      await settle();
      const frame = b.frames.at(-1) as { id?: string } | undefined;
      expect(typeof frame?.id).toBe("string");
      const response = await fetch(`${base}/bridge/file`, {
        method: "POST",
        headers: { origin: ORIGIN, "content-type": "application/json" },
        body: JSON.stringify({
          token: tokenFor("brw-b"),
          sessionId: b.sessionId,
          requestId: frame!.id,
          tool,
          path,
        }),
      });
      expect(response.status).toBe(200);
      await response.arrayBuffer();
    }

    expect(a.frames).toHaveLength(0);
    expect(b.frames).toHaveLength(2);
    await a.close();
    await b.close();
    await Promise.all(calls);
    await rm(dir, { recursive: true, force: true });
  });

  it("does not replace a disconnected target with the primary browser", async () => {
    const a = await openPanel("brw-a");

    await expect(
      bridge.callTool("editor_insert_image", {}, "brw-missing"),
    ).rejects.toMatchObject({ reason: "browser_unknown" });
    await settle();

    expect(a.frames).toHaveLength(0);
    await a.close();
  });

  it("marks an unaddressed fallback from a detached pinned browser", async () => {
    const a = await openPanel("brw-a");
    const b = await openPanel("brw-b");
    const pin = bridge.callTool("keyword_trend", {}, "brw-a");
    await settle();
    const pinnedFrame = a.frames[0] as { id?: string } | undefined;
    const answer = await fetch(`${base}/bridge/result`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${tokenFor("brw-a")}`,
      },
      body: JSON.stringify({
        t: "res",
        id: pinnedFrame?.id,
        ok: true,
        result: { ok: true },
        route: { browserId: "brw-a" },
      }),
    });
    expect(answer.status).toBe(202);
    await pin;
    await a.close();
    await settle();
    expect(bridge.connectedBrowsers()).toEqual([
      { id: "brw-b", name: "B", primary: true },
    ]);

    const pending = bridge
      .callTool("editor_insert_image", { path: "/private/image.png" })
      .catch(() => undefined);
    await settle();
    expect(b.frames).toHaveLength(1);
    expect(b.frames[0]?.routing).toMatchObject({
      targetBrowserId: "brw-b",
      explicit: false,
      fallbackFromPinned: true,
      connectedBrowserCount: 1,
    });

    await b.close();
    await pending;
  });

  it("keeps explicit browser B routing after browser B reconnects", async () => {
    const a = await openPanel("brw-a");
    const firstB = await openPanel("brw-b");
    await firstB.close();
    await settle();
    const secondB = await openPanel("brw-b");
    expect(secondB.sessionId).not.toBe(firstB.sessionId);

    void bridge
      .callTool("gallery_image_add", { path: "/private/image.png" }, "brw-b")
      .catch(() => {});
    await settle();

    expect(a.frames).toHaveLength(0);
    expect(firstB.frames).toHaveLength(0);
    expect(secondB.frames).toHaveLength(1);
    await a.close();
    await secondB.close();
  });

  it("rejects a duplicate browser B hello without disconnecting either stream", async () => {
    const a = await openPanel("brw-a");
    const b = await openPanel("brw-b");
    expect(refs).toBe(2);

    expect(await rawHandshake("brw-b")).toMatchObject({
      t: "hello_nack",
      reason: "session_active",
    });
    expect(refs).toBe(2);

    void bridge.callTool("keyword_trend", {}, "brw-a").catch(() => {});
    void bridge.callTool("gallery_image_add", {}, "brw-b").catch(() => {});
    await settle();
    expect(a.frames).toHaveLength(1);
    expect(b.frames).toHaveLength(1);

    await a.close();
    await b.close();
  });

  it("disconnects browser B without affecting browser A", async () => {
    const a = await openPanel("brw-a");
    const b = await openPanel("brw-b");

    http.disconnect("brw-b");
    await settle();

    // Gone rather than detached: a disconnect drops the session, and with no
    // ledger behind it there is nothing left claiming that browser exists.
    await expect(
      bridge.callTool("gallery_image_add", {}, "brw-b"),
    ).rejects.toMatchObject({ reason: "browser_unknown" });
    void bridge.callTool("keyword_trend", {}, "brw-a").catch(() => {});
    await settle();
    expect(a.frames).toHaveLength(1);
    expect(b.frames).toHaveLength(0);
    await a.close();
    await b.close();
  });

  it("뒤 브라우저의 스트림이 닫혀도 앞선 요청은 살아 있다", async () => {
    const a = await openPanel("brw-a");
    const b = await openPanel("brw-b");

    let settledEarly = false;
    const call = bridge
      .callTool("keyword_trend", { probe: 3 })
      .catch(() => {})
      .finally(() => {
        settledEarly = true;
      });

    await settle();
    await b.close();
    await settle();
    expect(settledEarly, "B 가 닫혔는데 A 의 요청이 끝났다").toBe(false);

    await a.close();
    await call;
    await settle();
    expect(refs).toBe(0);
  });
});
