/**
 * 🔴 A server holding a superseded pairing token has to let go of the port.
 *
 * It is detached and outlives the app that started it, and a replacement only
 * takes over on a newer version, so once a fresh token is issued nothing
 * outside can reconcile. Both guards are tested: a connected session means our
 * token is fine, and the identity gate drops anything not claiming to be our
 * extension before the token is looked at.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Bridge } from "../src/bridge.js";

const TOKEN = "pairing-token-that-is-long-enough-32";
const OTHER = "a-different-token-also-long-enough-32";
const EXT_ID = "abcdefghijklmnopabcdefghijklmnop";
const ORIGIN = `chrome-extension://${EXT_ID}`;

const hello = (token: string, extensionId = EXT_ID): unknown => ({
  t: "hello",
  protocolVersions: [1],
  extensionVersion: "1.1.13",
  token,
  extensionId,
});

const onStaleToken = vi.fn();

function bridge(): Bridge {
  return new Bridge({
    send: () => true,
    token: TOKEN,
    extensionId: EXT_ID,
    serverVersion: "0.0.1-test",
    log: () => {},
    onStaleToken,
  });
}

/** Refuse a run of handshakes with the wrong token. */
function refuse(b: Bridge, n: number): void {
  for (let i = 0; i < n; i += 1) b.handshake(hello(OTHER), ORIGIN);
}

beforeEach(() => {
  onStaleToken.mockClear();
});

describe("낡은 토큰을 쥔 서버", () => {
  it("검사 대상을 실제로 찾았다", () => {
    const b = bridge();
    expect(b.handshake(hello(OTHER), ORIGIN).t).toBe("hello_nack");
  });

  it("한 번 틀렸다고 물러나지는 않는다", () => {
    refuse(bridge(), 1);
    expect(onStaleToken).not.toHaveBeenCalled();
  });

  it("🔴 거부가 이어지면 스스로 물러난다 — 밖에서는 끝낼 방법이 없다", () => {
    refuse(bridge(), 5);
    expect(onStaleToken).toHaveBeenCalledTimes(1);
  });

  it("맞는 토큰이 한 번 들어오면 셈이 초기화된다", () => {
    const b = bridge();
    refuse(b, 4);
    expect(b.handshake(hello(TOKEN), ORIGIN).t).toBe("hello_ack");
    refuse(b, 4);
    expect(onStaleToken).not.toHaveBeenCalled();
  });

  it("🔴 붙어 있는 패널이 있으면 물러나지 않는다 — 우리 토큰은 맞다는 뜻", () => {
    const b = bridge();
    b.handshake(hello(TOKEN), ORIGIN);
    refuse(b, 20);
    expect(
      onStaleToken,
      "쓰고 있는 사람이 있는데 엉뚱한 요청 때문에 끊겼다",
    ).not.toHaveBeenCalled();
  });

  it("🔴 다른 출처는 셈에 들어가지 않는다 — 토큰 검사까지 오지도 못한다", () => {
    const b = bridge();
    for (let i = 0; i < 20; i += 1) {
      b.handshake(hello(OTHER), "chrome-extension://zzzzzzzzzzzzzzzzzzzz");
    }
    expect(onStaleToken).not.toHaveBeenCalled();
  });

  it("출처가 없을 때는 본문의 확장 id 가 같은 일을 한다", () => {
    const b = bridge();
    for (let i = 0; i < 20; i += 1) {
      b.handshake(hello(OTHER, "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"), null);
    }
    expect(onStaleToken).not.toHaveBeenCalled();
  });

  it("형태가 깨진 핸드셰이크도 셈에 들어가지 않는다", () => {
    const b = bridge();
    for (let i = 0; i < 20; i += 1) b.handshake({ t: "hello" }, ORIGIN);
    expect(onStaleToken).not.toHaveBeenCalled();
  });

  it("물러난 뒤에는 셈을 다시 시작한다", () => {
    const b = bridge();
    refuse(b, 5);
    expect(onStaleToken).toHaveBeenCalledTimes(1);
    refuse(b, 4);
    expect(onStaleToken).toHaveBeenCalledTimes(1);
    refuse(b, 1);
    expect(onStaleToken).toHaveBeenCalledTimes(2);
  });
});
