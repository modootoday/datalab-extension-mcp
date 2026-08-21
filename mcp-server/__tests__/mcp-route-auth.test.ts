import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { REQUIRED_BROWSER_CAPABILITIES } from "@modootoday/extension-app-mcp-core";

import { Bridge } from "../src/bridge.js";
import { createHttpBridge, type HttpBridge } from "../src/http.js";

/**
 * What the public MCP transport gives a caller that has no credential.
 *
 * These RECORD a boundary; they do not assert a defence. `/mcp` is the route
 * the host's adapter speaks and it is strictly more powerful than the answer
 * routes — it lists the catalog and calls tools — and its own comment says
 * loopback reach is the gate. The answer routes now say the opposite, so the
 * two halves of this server hold different threat models and this is where the
 * difference is widest.
 *
 * Written down rather than closed, because there is no seam to close it
 * through: `/mcp` is stateless, so a caller has nowhere to declare it will
 * carry a credential the way a panel does at handshake. A gate here is an
 * outright break for the three adapter paths that never update, which is an
 * operator's call and not this test's.
 */
const ROOT = "pairing-token-that-is-long-enough-32";
const EXT_ID = "a".repeat(32);
const ORIGIN = `chrome-extension://${EXT_ID}`;

let http: HttpBridge;
let bridge: Bridge;
let base = "";
let logged: string[] = [];

beforeEach(async () => {
  bridge = new Bridge({
    send: (frame, key) => http.send(frame, key),
    token: ROOT,
    extensionIds: [EXT_ID],
    serverVersion: "0.0.1-test",
    log: () => {},
  });
  logged = [];
  http = createHttpBridge({
    bridge,
    port: 0,
    identity: { name: "test", version: "0.0.0-test" },
    heartbeatMs: 25,
    log: (line) => logged.push(line),
  });
  await new Promise<void>((r) => http.server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(http.server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  await http.close();
});

const rpc = (
  method: string,
  params?: unknown,
  token?: string,
): Promise<Response> =>
  fetch(`${base}/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });

describe("MCP 전송 경로가 자격 증명 없이 내주는 것", () => {
  it("카탈로그를 내준다", async () => {
    const res = await rpc("tools/list");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result?: { tools?: Array<{ name: string }> };
    };
    const names = (body.result?.tools ?? []).map((t) => t.name);
    // The daemon's own tools answer with no browser attached at all, so the
    // catalog is readable by anyone before a panel has ever connected.
    expect(names).toContain("datalab_catalog");
  });

  /**
   * With a panel attached, a call from an un-credentialed local process is
   * handed to it. The panel's own consent machine is what stands between that
   * caller and a write — for the read tier there is nothing else.
   */
  it("패널이 붙어 있으면 호출이 패널까지 간다", async () => {
    const ack = bridge.handshake(
      {
        t: "hello",
        protocolVersions: [1],
        extensionVersion: "1.1.13",
        token: ROOT,
        extensionId: EXT_ID,
        browserId: "brw-a",
        capabilities: [...REQUIRED_BROWSER_CAPABILITIES],
      },
      ORIGIN,
    );
    if (ack.t !== "hello_ack") throw new Error("handshake refused");
    const stream = await fetch(
      `${base}/bridge/events?session=${ack.sessionId}`,
      {
        headers: { origin: ORIGIN, authorization: `Bearer ${ROOT}` },
      },
    );
    expect(stream.status).toBe(200);

    const reader = stream.body!.getReader();
    const decoder = new TextDecoder();
    const sawRequest = (async () => {
      let buffered = "";
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) return false;
        buffered += decoder.decode(chunk.value, { stream: true });
        if (buffered.includes('"t":"req"')) return true;
      }
    })();

    // Never answered — the panel here is a socket, not an executor — so the
    // request outlives the test. Swallowed so teardown closing it is not an
    // unhandled rejection standing in for a real failure.
    const call = rpc("tools/call", {
      name: "datalab_status",
      arguments: {},
    }).catch(() => undefined);
    expect(await sawRequest, "패널까지 가지 않았다").toBe(true);
    await reader.cancel();
    await call;
  });
});

/**
 * Whether this route can ever require a credential is a question about who
 * is still calling without one, and until now nothing was measuring it. The
 * count is the evidence; refusing is a separate decision that needs it first.
 */
describe("자격 증명 없이 오는 호출을 센다", () => {
  it("자격 없는 호출이 로그에 남는다", async () => {
    await rpc("tools/list");
    expect(logged.join("\n")).toContain("no pairing credential");
  });

  it("자격을 실은 호출은 그렇게 남는다", async () => {
    await rpc("tools/list", undefined, ROOT);
    expect(logged.join("\n")).toContain("carrying the pairing credential");
  });

  // One line per order of magnitude. A per-call line would bury the
  // connector log the user is meant to be able to read.
  it("매 호출마다 적지 않는다", async () => {
    for (let i = 0; i < 5; i += 1) await rpc("tools/list");
    const lines = logged.filter((l) => l.includes("no pairing credential"));
    expect(lines).toHaveLength(1);
  });

  it("자격 유무는 응답을 바꾸지 않는다 — 아직 게이트가 아니다", async () => {
    expect((await rpc("tools/list")).status).toBe(200);
    expect((await rpc("tools/list", undefined, ROOT)).status).toBe(200);
  });
});

/**
 * The same shape for a different question. Two hosts driving one browser are
 * indistinguishable here — one shared credential, one shared token bucket, and
 * an editor lease that gives every outside caller the same owner key — so this
 * counts whether two ever call at once rather than arbitrating between them.
 */
describe("바깥 호출자가 둘인지 세는 것", () => {
  const asClient = (id: string): Promise<Response> =>
    fetch(`${base}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-datalab-mcp-client": id,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });

  const clientLines = (): string[] =>
    logged.filter((l) => l.includes("adapters called within"));

  it("혼자면 아무것도 적지 않는다", async () => {
    await asClient("one");
    await asClient("one");
    expect(clientLines()).toHaveLength(0);
  });

  it("둘이 겹치면 한 줄 남는다", async () => {
    await asClient("one");
    await asClient("two");
    expect(clientLines()).toHaveLength(1);
    expect(clientLines()[0]).toContain("2 adapters");
  });

  // High-water mark, not per call. A busy pair would otherwise write a line
  // every request into the log the user is meant to be able to read.
  it("최고치가 오를 때만 적는다", async () => {
    for (const id of ["one", "two", "one", "two", "one"]) await asClient(id);
    expect(clientLines()).toHaveLength(1);
    await asClient("three");
    expect(clientLines()).toHaveLength(2);
    expect(clientLines()[1]).toContain("3 adapters");
  });

  it("헤더가 없는 옛 어댑터는 세지 않는다", async () => {
    await rpc("tools/list");
    await rpc("tools/list");
    expect(clientLines()).toHaveLength(0);
  });
});
