import { describe, expect, it } from "vitest";
import { REQUIRED_BROWSER_CAPABILITIES } from "@modootoday/extension-app-mcp-core";

import { Bridge } from "../src/bridge.js";

const ROOT = "pairing-token-that-is-long-enough-32";
const WRONG = "a-different-token-also-long-enough-32";
const EXT_ID = "abcdefghijklmnopabcdefghijklmnop";
const ORIGIN = `chrome-extension://${EXT_ID}`;

const hello = (token: string, browserId?: string): unknown => ({
  t: "hello",
  protocolVersions: [1],
  extensionVersion: "1.1.32",
  token,
  extensionId: EXT_ID,
  ...(browserId ? { browserId } : {}),
  capabilities: [...REQUIRED_BROWSER_CAPABILITIES],
});

function bridge(): Bridge {
  return new Bridge({
    send: () => true,
    token: ROOT,
    extensionIds: [EXT_ID],
    serverVersion: "1.9.0-test",
    log: () => {},
  });
}

describe("unauthorized handshakes", () => {
  it("capability 검사 전에 세션을 만들지 않는다", () => {
    const b = bridge();
    expect(
      b.handshake(
        { ...(hello(ROOT, "brw-new") as object), capabilities: [] },
        ORIGIN,
      ),
    ).toMatchObject({
      t: "hello_nack",
      reason: "browser_capability_required",
    });
    expect(b.connected).toBe(false);
  });

  /**
   * The refusals a wrong key produces must not add up to anything. Fifty of
   * them in a row leave the bridge exactly as it was, so a local process that
   * keeps guessing cannot wear a session into existence.
   */
  it("틀린 키는 몇 번을 두드려도 세션이 되지 않는다", () => {
    const b = bridge();
    for (let i = 0; i < 50; i += 1) {
      expect(
        b.handshake(hello(WRONG, `unknown-${String(i)}`), ORIGIN),
      ).toMatchObject({ t: "hello_nack", reason: "unauthorized" });
    }
    expect(b.connected).toBe(false);
    expect(b.session).toBeNull();
  });

  it("붙어 있는 세션을 남의 실패한 악수가 끊지 못한다", () => {
    const b = bridge();
    const attached = b.handshake(hello(ROOT, "brw-a"), ORIGIN);
    expect(attached.t).toBe("hello_ack");
    if (attached.t !== "hello_ack") throw new Error("handshake failed");
    expect(b.activateSession("brw-a", attached.sessionId)).toBe(true);

    for (let i = 0; i < 50; i += 1) {
      expect(b.handshake(hello(WRONG, "brw-a"), ORIGIN)).toMatchObject({
        t: "hello_nack",
        reason: "unauthorized",
      });
    }

    expect(b.connected).toBe(true);
    expect(b.session?.sessionId).toBe(attached.sessionId);
  });
});
