import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { REQUIRED_BROWSER_CAPABILITIES } from "@modootoday/extension-app-mcp-core";

import { Bridge } from "../src/bridge.js";
import { createHttpBridge, type HttpBridge } from "../src/http.js";

/**
 * The two routes the panel answers on. Loopback reach is not the gate here:
 * `/mcp/shutdown` and `/bridge/file` already refuse another local process by
 * token, and these two carry the tool results the model reads. A caller that
 * can post an answer decides what the model is told.
 */
const ROOT = "pairing-token-that-is-long-enough-32";
const EXT_ID = "a".repeat(32);
const ORIGIN = `chrome-extension://${EXT_ID}`;

let http: HttpBridge;
let bridge: Bridge;
let base = "";

const hello = (declares = true): unknown => ({
  t: "hello",
  protocolVersions: [1],
  extensionVersion: "1.1.13",
  token: ROOT,
  extensionId: EXT_ID,
  browserId: "brw-a",
  capabilities: declares ? [...REQUIRED_BROWSER_CAPABILITIES] : [],
});

beforeEach(async () => {
  bridge = new Bridge({
    send: (frame, key) => http.send(frame, key),
    token: ROOT,
    extensionIds: [EXT_ID],
    serverVersion: "0.0.1-test",
    log: () => {},
  });
  http = createHttpBridge({
    bridge,
    port: 0,
    identity: { name: "test", version: "0.0.0-test" },
    // node:http holds the head until something is written, so at the real
    // interval an accepted stream reads from outside exactly like a hung one.
    heartbeatMs: 25,
  });
  await new Promise<void>((r) => http.server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(http.server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  await http.close();
});

/** Open the stream the way the panel does, optionally without a credential. */
const openStream = (
  sessionId: string | null,
  token: string | null,
): Promise<Response> =>
  fetch(
    `${base}/bridge/events${sessionId === null ? "" : `?session=${sessionId}`}`,
    {
      headers: {
        origin: ORIGIN,
        ...(token === null ? {} : { authorization: `Bearer ${token}` }),
      },
    },
  );

const handshake = (declares = true): string => {
  const ack = bridge.handshake(hello(declares), ORIGIN);
  if (ack.t !== "hello_ack") throw new Error("handshake refused");
  return ack.sessionId;
};

const postResult = (body: unknown, token: string | null): Promise<Response> =>
  fetch(`${base}/bridge/result`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token === null ? {} : { authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });

/**
 * Pull the first frame carrying work, leaving the stream open. Heartbeats are
 * what flush the head, so they arrive first and are skipped.
 *
 * Never cancel the reader to stop early. Cancelling closes the socket, the
 * session goes with it, and every route that asks "is anyone connected" then
 * answers no — which reads exactly like the refusal being measured.
 */
function frameSource(res: Response): {
  next: () => Promise<Record<string, unknown>>;
  done: () => Promise<void>;
} {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  const next = async (): Promise<Record<string, unknown>> => {
    for (;;) {
      const at = buffered.indexOf("\n\n");
      if (at !== -1) {
        const line = buffered.slice(0, at).replace(/^data: /, "");
        buffered = buffered.slice(at + 2);
        const frame = JSON.parse(line) as Record<string, unknown>;
        if (frame.t !== "hb") return frame;
        continue;
      }
      const chunk = await reader.read();
      if (chunk.done) throw new Error("stream ended before a request arrived");
      buffered += decoder.decode(chunk.value, { stream: true });
    }
  };
  return { next, done: () => reader.cancel() };
}

describe("브릿지 응답 경로", () => {
  it("스트림은 자격 증명 없이는 열리지 않는다", async () => {
    const sessionId = handshake();
    expect((await openStream(sessionId, null)).status).toBe(403);
  });

  it("붙어 있는 자격 증명이면 스트림이 열린다", async () => {
    const sessionId = handshake();
    const res = await openStream(sessionId, ROOT);
    expect(res.status).toBe(200);
    await res.body?.cancel();
  });

  /**
   * The whole point. Without the gate a local process reads the request id
   * off a stream it took, answers it, and the model is handed that answer as
   * the tool's own output — no error anywhere, nothing to notice.
   */
  it("자격 증명 없는 답은 진행 중인 호출을 결정하지 못한다", async () => {
    const sessionId = handshake();
    const stream = await openStream(sessionId, ROOT);
    expect(stream.status).toBe(200);

    const frames = frameSource(stream);
    const call = bridge.callTool("datalab_status", {});
    const req = await frames.next();
    expect(req.t).toBe("req");

    const forged = await postResult(
      { t: "res", id: req.id, ok: true, result: "attacker's answer" },
      null,
    );
    expect(forged.status).toBe(403);

    // The call is still waiting, so the real panel's answer still decides it.
    const honest = await postResult(
      {
        t: "res",
        id: req.id,
        ok: true,
        result: "the panel's answer",
        route: { browserId: "brw-a" },
      },
      ROOT,
    );
    expect(honest.status).toBe(202);
    const outcome = (await call) as { result: unknown };
    expect(outcome.result).toBe("the panel's answer");
    await frames.done();
  });
});

describe("필수 capability를 선언하지 않은 패널", () => {
  it("세션을 만들지 않는다", () => {
    expect(bridge.handshake(hello(false), ORIGIN)).toMatchObject({
      t: "hello_nack",
      reason: "browser_capability_required",
    });
    expect(bridge.connected).toBe(false);
  });

  it.each(REQUIRED_BROWSER_CAPABILITIES)(
    "%s 하나만 빠져도 세션을 만들지 않는다",
    (missing) => {
      const candidate = hello(true) as Record<string, unknown>;
      candidate.capabilities = REQUIRED_BROWSER_CAPABILITIES.filter(
        (capability) => capability !== missing,
      );
      expect(bridge.handshake(candidate, ORIGIN)).toMatchObject({
        t: "hello_nack",
        reason: "browser_capability_required",
      });
      expect(bridge.connected).toBe(false);
    },
  );

  it("성공 응답은 협상된 capability 전체를 되돌려 준다", () => {
    expect(bridge.handshake(hello(true), ORIGIN)).toMatchObject({
      t: "hello_ack",
      capabilities: [...REQUIRED_BROWSER_CAPABILITIES],
    });
  });
});
