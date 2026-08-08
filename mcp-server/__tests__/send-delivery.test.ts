/**
 * 🔴 A frame that reached nobody must fail now, not at the deadline.
 *
 * The session and the stream are different things: a panel can complete the
 * handshake and then lose the stream it would answer on. The delivery result
 * is what tells the two apart, so these guard against dropping it — an arrow
 * that calls send and returns nothing reads as never having delivered.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Bridge } from "../src/bridge.js";
import { BRIDGE_USER_MESSAGES } from "@modootoday/extension-app-mcp-core";

const TOKEN = "pairing-token-that-is-long-enough-32";
const EXT_ID = "abcdefghijklmnopabcdefghijklmnop";

const HELLO = {
  t: "hello" as const,
  protocolVersions: [1],
  extensionVersion: "1.1.13",
  token: TOKEN,
  extensionId: EXT_ID,
};

function connected(send: (frame: unknown) => boolean): Bridge {
  const bridge = new Bridge({
    send: send as never,
    token: TOKEN,
    extensionId: EXT_ID,
    serverVersion: "0.0.1-test",
    log: () => {},
  });
  const ack = bridge.handshake(HELLO, `chrome-extension://${EXT_ID}`);
  if (ack.t !== "hello_ack") throw new Error(`handshake refused: ${ack.t}`);
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

  it("🔴 아무에게도 닿지 않으면 곧바로 실패한다", async () => {
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

  it("🔴 마감을 기다리지 않는다", async () => {
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
      send: send as never,
      token: TOKEN,
      extensionId: EXT_ID,
      serverVersion: "0.0.1-test",
      log: () => {},
    });
    await expect(bridge.callTool("keyword_trend", {})).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
});
