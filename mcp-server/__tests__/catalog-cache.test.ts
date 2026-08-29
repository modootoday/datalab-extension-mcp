/**
 * Blocks the two paths that freeze a host's tool list at zero. Many hosts
 * cache the first list they receive and ignore list-changed notifications, so
 * handing one an empty list as a success leaves it empty until it is
 * restarted, with nothing on our side able to undo it. Guards both ends of the
 * cache: what is answered while empty, and what may overwrite it.
 */
import { describe, expect, it, vi } from "vitest";

import { Bridge } from "../src/bridge.js";
import { REQUIRED_BROWSER_CAPABILITIES } from "@modootoday/extension-app-mcp-core";

const TOKEN = "pairing-token-that-is-long-enough-32";
const EXT_ID = "abcdefghijklmnopabcdefghijklmnop";

const HELLO = {
  t: "hello" as const,
  protocolVersions: [1],
  extensionVersion: "1.1.13",
  token: TOKEN,
  extensionId: EXT_ID,
  browserId: "brw-a",
  capabilities: [...REQUIRED_BROWSER_CAPABILITIES],
};

/** A connected bridge plus a handle deciding what the panel answers next. */
function connectedBridge(logs: string[] = []): {
  bridge: Bridge;
  answerWith: (tools: unknown[]) => void;
} {
  let next: unknown[] = [];
  const bridge = new Bridge({
    send: (frame, key) => {
      // Answers as if the panel replied at once: the subject here is the
      // cache, not the round trip.
      const { id } = frame as { id: string };
      queueMicrotask(() => {
        bridge.receive(
          { t: "tools", id, tools: next, route: { browserId: key } },
          TOKEN,
        );
      });
      return true;
    },
    token: TOKEN,
    extensionIds: [EXT_ID],
    serverVersion: "0.0.1-test",
    log: (m: string) => logs.push(m),
  });
  const ack = bridge.handshake(HELLO, `chrome-extension://${EXT_ID}`);
  if (ack.t !== "hello_ack") throw new Error(`handshake refused: ${ack.t}`);
  const key = bridge.keyForSession(ack.sessionId);
  if (key === null) throw new Error("session key missing");
  expect(bridge.activateSession(key, ack.sessionId)).toBe(true);
  return {
    bridge,
    answerWith: (tools) => {
      next = tools;
    },
  };
}

const TOOL = (name: string): Record<string, unknown> => ({
  name,
  description: "t",
  inputSchema: { type: "object" },
});

describe("캐시는 실제로 받은 목록으로만 채워진다", () => {
  it("성공한 목록이 캐시에 남는다", async () => {
    const { bridge, answerWith } = connectedBridge();
    answerWith([TOOL("keyword_trend")]);
    await bridge.listTools();
    expect(bridge.lastKnownTools.map((t) => t.name)).toEqual(["keyword_trend"]);
  });

  it("빈 목록은 멀쩡한 캐시를 덮지 않는다", async () => {
    // A healthy panel cannot report zero, so an empty list means this one
    // response is wrong, not that the tools are gone. Caching it would make
    // one anomaly permanent for every later disconnect.
    const logs: string[] = [];
    const { bridge, answerWith } = connectedBridge(logs);
    answerWith([TOOL("keyword_trend"), TOOL("my_realtime")]);
    await bridge.listTools();

    answerWith([]);
    const second = await bridge.listTools();

    // This response is honestly empty, and the cache survives it.
    expect(second.tools).toEqual([]);
    expect(bridge.lastKnownTools).toHaveLength(2);
    // Never silent: an operator must be able to find the cause in the log.
    expect(logs.some((l) => l.includes("keeping"))).toBe(true);
  });

  it("목록이 늘면 캐시도 늘어난다 — 새 패널이 도구를 더할 수 있다", async () => {
    const { bridge, answerWith } = connectedBridge();
    answerWith([TOOL("keyword_trend")]);
    await bridge.listTools();
    answerWith([TOOL("keyword_trend"), TOOL("my_realtime")]);
    await bridge.listTools();
    expect(bridge.lastKnownTools).toHaveLength(2);
  });

  it("한 번도 안 붙었으면 캐시는 비어 있다 — 그 상태를 mcp-http 가 오류로 답한다", () => {
    const bridge = new Bridge({
      send: () => true,
      token: TOKEN,
      extensionIds: [EXT_ID],
      serverVersion: "0.0.1-test",
      log: vi.fn(),
    });
    expect(bridge.connected).toBe(false);
    expect(bridge.lastKnownTools).toHaveLength(0);
  });
});
