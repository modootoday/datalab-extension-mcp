/**
 * A frame that reached nobody must fail now, not at the deadline.
 *
 * The session and the stream are different things: a panel can complete the
 * handshake and then lose the stream it would answer on. The delivery result
 * is what tells the two apart, so these guard against dropping it — an arrow
 * that calls send and returns nothing reads as never having delivered.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Bridge, type BridgeDeps } from "../src/bridge.js";
import {
  BRIDGE_USER_MESSAGES,
  REQUIRED_BROWSER_CAPABILITIES,
} from "@modootoday/extension-app-mcp-core";

const ROOT = "pairing-token-that-is-long-enough-32";
const EXT_ID = "abcdefghijklmnopabcdefghijklmnop";

const HELLO = {
  t: "hello" as const,
  protocolVersions: [1],
  extensionVersion: "1.1.13",
  token: ROOT,
  extensionId: EXT_ID,
  browserId: "brw-a",
  capabilities: [...REQUIRED_BROWSER_CAPABILITIES],
};

/**
 * Typed exactly, never cast. A cast here lets the send signature change
 * underneath every test in this file while they all stay green — which is what
 * happened to it once, and the delivery contract is this file's whole subject.
 */
function connected(send: BridgeDeps["send"], hello: unknown = HELLO): Bridge {
  const bridge = new Bridge({
    send,
    token: ROOT,
    extensionIds: [EXT_ID],
    serverVersion: "0.0.1-test",
    log: () => {},
  });
  const ack = bridge.handshake(hello, `chrome-extension://${EXT_ID}`);
  if (ack.t !== "hello_ack") throw new Error(`handshake refused: ${ack.t}`);
  const key = bridge.keyForSession(ack.sessionId);
  if (key === null || !bridge.activateSession(key, ack.sessionId)) {
    throw new Error("session activation failed");
  }
  return bridge;
}

describe("전달되지 않은 프레임", () => {
  let delivered: boolean;
  const send = vi.fn(() => delivered);

  beforeEach(() => {
    delivered = true;
    send.mockClear();
  });

  it("검사 대상을 실제로 찾았다", () => {
    const bridge = connected(send);
    void bridge.callTool("keyword_trend", {});
    expect(send).toHaveBeenCalled();
  });

  it("아무에게도 닿지 않으면 곧바로 실패한다", async () => {
    delivered = false;
    const bridge = connected(send);
    await expect(bridge.callTool("keyword_trend", {})).rejects.toThrow();
  });

  it("그때 안내는 패널이 닫혔다는 것 — 사용자가 할 수 있는 일이다", async () => {
    delivered = false;
    const bridge = connected(send);
    const err = await bridge
      .callTool("keyword_trend", {})
      .catch((e: unknown) =>
        e instanceof Error ? (e as Error & { reason?: string }) : null,
      );
    expect(err?.reason).toBe("not_connected");
    expect(err?.message).toBe(BRIDGE_USER_MESSAGES.panelClosed);
  });

  it("마감을 기다리지 않는다", async () => {
    // Awaited with no timer so a failure to settle immediately hangs this test
    // rather than passing.
    delivered = false;
    const bridge = connected(send);
    const started = Date.now();
    await bridge.callTool("keyword_trend", {}).catch(() => undefined);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("전달된 프레임은 답을 기다린다 — 성급히 끝내지 않는다", async () => {
    delivered = true;
    const bridge = connected(send);
    let settled = false;
    void bridge.callTool("keyword_trend", {}).then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled, "패널이 답하기도 전에 끝났다").toBe(false);
  });

  it("세션이 없으면 애초에 보내지 않는다", async () => {
    const bridge = new Bridge({
      send,
      token: ROOT,
      extensionIds: [EXT_ID],
      serverVersion: "0.0.1-test",
      log: () => {},
    });
    await expect(bridge.callTool("keyword_trend", {})).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
});

/**
 * A frame has to name the browser it is for. The key was the one thing a
 * send could not say before, and with a stream per browser the missing name
 * would not be an error — it would be a frame delivered to whoever happened to
 * be listening, which is the failure this whole change exists to prevent.
 */
describe("보낼 곳", () => {
  const keys = (fn: ReturnType<typeof vi.fn>): unknown[] =>
    fn.mock.calls.map((c) => c[1]);

  const helloFrom = (browserId: string) => ({ ...HELLO, browserId });

  it("키가 다른 브라우저는 세션을 만들지 않는다", () => {
    const send = vi.fn(() => true);
    const bridge = new Bridge({
      send,
      token: ROOT,
      extensionIds: [EXT_ID],
      serverVersion: "0.0.1-test",
      log: () => {},
    });
    const ack = bridge.handshake(
      { ...HELLO, token: "z".repeat(64) },
      `chrome-extension://${EXT_ID}`,
    );
    expect(ack).toMatchObject({
      t: "hello_nack",
      reason: "unauthorized",
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("붙은 브라우저는 자기 키로 보낸다", () => {
    const send = vi.fn(() => true);
    const bridge = connected(send, helloFrom("brw-a"));
    void bridge.callTool("keyword_trend", {}).catch(() => {});
    expect(keys(send)).toEqual(["brw-a"]);
  });

  it("리로드로 세션이 바뀌어도 키는 그대로다", () => {
    const send = vi.fn(() => true);
    const bridge = connected(send, helloFrom("brw-a"));
    void bridge.callTool("keyword_trend", {}).catch(() => {});
    bridge.disconnect("brw-a");
    const reconnected = bridge.handshake(
      helloFrom("brw-a"),
      `chrome-extension://${EXT_ID}`,
    );
    if (reconnected.t !== "hello_ack") throw new Error("reconnect refused");
    bridge.activateSession("brw-a", reconnected.sessionId);
    void bridge.callTool("keyword_trend", {}).catch(() => {});

    expect(keys(send)).toEqual(["brw-a", "brw-a"]);
    // The registry changed underneath, which is what the differing ids show.
    const ids = send.mock.calls.map((c) => (c[0] as { id: string }).id);
    expect(ids[0]).not.toBe(ids[1]);
    bridge.disconnectAll();
  });

  // Stated as a fact, not a wish: with no browser named, every call goes to
  // the oldest session. When calls can be addressed this assertion is the thing
  // that must break, and that is the signal we want it to give.
  it("브라우저를 지목하지 않으면 가장 오래된 세션으로 간다", () => {
    const send = vi.fn(() => true);
    const bridge = connected(send, helloFrom("brw-a"));
    const second = bridge.handshake(
      helloFrom("brw-b"),
      `chrome-extension://${EXT_ID}`,
    );
    if (second.t !== "hello_ack") throw new Error("handshake refused");
    bridge.activateSession("brw-b", second.sessionId);
    void bridge.callTool("keyword_trend", {}).catch(() => {});
    expect(keys(send)).toEqual(["brw-a"]);
    bridge.disconnectAll();
  });
});
