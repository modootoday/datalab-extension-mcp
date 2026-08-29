import { describe, expect, it } from "vitest";
import { REQUIRED_BROWSER_CAPABILITIES } from "@modootoday/extension-app-mcp-core";

import { Bridge } from "../src/bridge.js";

/**
 * Until now a request registry could not be lost: there was one, and it
 * lived as long as the bridge. Owning one per session makes losing one
 * possible, and a registry dropped with a request inside it hangs the host's
 * turn with nothing to show — the outcome `pending.ts` calls the worst this
 * design can produce. These tests are about that.
 *
 * What they can only half reach: a call names no browser, so every one lands
 * on the oldest session and no second registry ever holds a request. One
 * direction is still writable and it is below; the other would only restate
 * this file's own assumption, so it waits for calls that can be addressed.
 */

const ROOT = "r".repeat(64);
const EXT_ID = "a".repeat(32);
const ORIGIN = `chrome-extension://${EXT_ID}`;

const hello = (browserId: string) => ({
  t: "hello" as const,
  protocolVersions: [1],
  extensionVersion: "1.1.13",
  token: ROOT,
  extensionId: EXT_ID,
  browserId,
  capabilities: [...REQUIRED_BROWSER_CAPABILITIES],
});

/** One key, two names: the only way two sessions coexist. */
function twoBrowserBridge(send: (frame: unknown) => boolean = () => true) {
  const sent: { id: string }[] = [];
  const bridge = new Bridge({
    send: (frame) => {
      sent.push(frame as { id: string });
      return send(frame);
    },
    token: ROOT,
    extensionIds: [EXT_ID],
    serverVersion: "0.0.1-test",
    log: () => {},
  });
  const connect = (browserId: string): void => {
    const ack = bridge.handshake(hello(browserId), ORIGIN);
    if (ack.t !== "hello_ack") throw new Error(`handshake refused: ${ack.t}`);
    expect(bridge.activateSession(browserId, ack.sessionId)).toBe(true);
  };
  return { bridge, connect, sent };
}

describe("세션 소멸", () => {
  it("끊기면 그 세션의 요청이 남김없이 settle 된다", async () => {
    const { bridge, connect } = twoBrowserBridge();
    connect("brw-a");
    const call = bridge.callTool("keyword_trend", {});
    bridge.disconnectAll();
    await expect(call).rejects.toThrow();
  });

  it("새 hello 가 같은 브라우저의 활성 세션과 요청을 보존한다", async () => {
    const { bridge, connect } = twoBrowserBridge();
    connect("brw-a");
    const call = bridge.callTool("keyword_trend", {});
    const contender = bridge.handshake(hello("brw-a"), ORIGIN);
    expect(contender).toMatchObject({
      t: "hello_nack",
      reason: "session_active",
    });
    let settled = false;
    void call.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(settled).toBe(false);
    bridge.disconnectAll();
    await expect(call).rejects.toThrow();
  });

  it("같은 키는 기존 stream 종료 뒤 다시 연결된다", () => {
    const { bridge, connect } = twoBrowserBridge();
    connect("brw-a");
    bridge.disconnect("brw-a");
    expect(() => connect("brw-a")).not.toThrow();
    expect(bridge.sessionKey).toBe("brw-a");
  });

  // A call names no browser, so it goes to the oldest session. If reloading
  // a panel moved that browser to the back, the next call would land on someone
  // else's browser — and with a blog behind each one, on someone else's blog.
  it("패널을 다시 열어도 순서가 바뀌지 않는다", () => {
    const { bridge, connect } = twoBrowserBridge();
    connect("brw-a");
    connect("brw-b");
    expect(bridge.sessionKey).toBe("brw-a");

    bridge.disconnect("brw-a");
    connect("brw-a");
    expect(bridge.sessionKey, "리로드가 주인을 바꿨다").toBe("brw-a");
    expect(bridge.connected).toBe(true);
  });

  it("한 세션을 교체해도 다른 세션은 맵에 남는다", () => {
    const { bridge, connect } = twoBrowserBridge();
    connect("brw-a");
    connect("brw-b");
    bridge.disconnect("brw-a");
    connect("brw-a");

    const bId = bridge.keyForSession("s2");
    expect(bId).toBe("brw-b");
  });
});

/**
 * Only one direction of isolation is reachable. A call names no browser, so
 * every one lands on the oldest session and the second registry never holds a
 * request — "B's request survives A leaving" cannot be written at all. What can
 * be written is the half that runs the other way, and it is the half that
 * catches a close reaching outside its own entry.
 */
describe("세션 격리 — 도달 가능한 절반", () => {
  it("뒤 세션이 사라져도 앞 세션의 요청은 살아 있다", async () => {
    const { bridge, connect } = twoBrowserBridge();
    connect("brw-a");
    const call = bridge.callTool("keyword_trend", {});
    let settled = false;
    void call
      .catch(() => {})
      .finally(() => {
        settled = true;
      });

    connect("brw-b");
    bridge.disconnect("brw-b");
    // A macrotask, not a couple of microtasks: the rejection travels through
    // the registry, the awaited call, and a catch before it reaches this flag,
    // and counting ticks was already wrong here once.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(settled, "B 가 사라졌는데 A 의 요청이 끝났다").toBe(false);

    bridge.disconnectAll();
    await expect(call).rejects.toThrow();
  });
});

describe("요청 라우팅", () => {
  it("세션마다 id 접두가 다르다 — 교차 settle 을 막는 것이 이것이다", () => {
    const { bridge, connect, sent } = twoBrowserBridge();
    connect("brw-a");
    void bridge.callTool("keyword_trend", {}).catch(() => {});
    bridge.disconnect("brw-a");
    connect("brw-a");
    void bridge.callTool("keyword_trend", {}).catch(() => {});

    const prefix = (id: string): string => id.slice(0, id.lastIndexOf("-"));
    expect(sent).toHaveLength(2);
    // Both are the first request of their own registry, so a shared prefix
    // would make them the same id and let either answer settle the other.
    expect(prefix(sent[0]!.id)).not.toBe(prefix(sent[1]!.id));
    expect(sent[0]!.id).not.toBe(sent[1]!.id);
    bridge.disconnectAll();
  });

  it("호출은 가장 오래된 세션으로 간다", () => {
    const { bridge, connect } = twoBrowserBridge();
    connect("brw-a");
    connect("brw-b");
    expect(bridge.session?.sessionId).toBe("s1");
    bridge.disconnectAll();
  });

  it("다른 브라우저의 hello 가 전역 요청 예산을 보충하지 않는다", async () => {
    const bridge = new Bridge({
      send: () => true,
      token: ROOT,
      extensionIds: [EXT_ID],
      serverVersion: "0.0.1-test",
      rateLimit: { capacity: 1, refillPerSecond: 0 },
      log: () => {},
    });
    const ackA = bridge.handshake(hello("brw-a"), ORIGIN);
    if (ackA.t !== "hello_ack") throw new Error("A handshake failed");
    expect(bridge.activateSession("brw-a", ackA.sessionId)).toBe(true);
    const first = bridge.callTool("keyword_trend", {});

    const ackB = bridge.handshake(hello("brw-b"), ORIGIN);
    if (ackB.t !== "hello_ack") throw new Error("B handshake failed");
    expect(bridge.activateSession("brw-b", ackB.sessionId)).toBe(true);
    await expect(bridge.callTool("keyword_trend", {})).rejects.toMatchObject({
      reason: "rate_limited",
    });

    bridge.disconnectAll();
    await expect(first).rejects.toThrow();
  });
});
