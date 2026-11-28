import { request } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { REQUIRED_BROWSER_CAPABILITIES } from "@modootoday/datalab-extension-app-mcp-core";

import { Bridge } from "../src/bridge.js";
import { createHttpBridge, type HttpBridge } from "../src/http.js";

const TOKEN = "k".repeat(64);
const EXT_ID = "abcdefghijklmnopabcdefghijklmnop";
const EXT_ORIGIN = `chrome-extension://${EXT_ID}`;
const PAGE_ORIGIN = "https://page.example";

let bridge: Bridge;
let http: HttpBridge;
let port: number;

beforeEach(async () => {
  bridge = new Bridge({
    send: (frame, key) => http.send(frame, key),
    token: TOKEN,
    extensionIds: [EXT_ID],
    serverVersion: "0.0.1-test",
    log: () => {},
  });
  http = createHttpBridge({
    bridge,
    port: 0,
    heartbeatMs: 50,
    identity: { name: "datalab-extension-mcp-server", version: "0.0.1-test" },
  });
  await new Promise<void>((r) => http.server.listen(0, "127.0.0.1", r));
  port = (http.server.address() as AddressInfo).port;
});

afterEach(async () => {
  await http.close();
});

interface Answer {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

function send(
  path: string,
  opts: { method?: string; headers?: Record<string, string>; body?: string },
): Promise<Answer> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: "127.0.0.1",
        port,
        path,
        method: opts.method ?? "POST",
        headers: opts.headers ?? {},
        setHost: false,
      },
      (res) => {
        let body = "";
        res.on("data", (c: Buffer) => (body += c.toString("utf8")));
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, headers: res.headers, body }),
        );
      },
    );
    req.on("error", reject);
    req.end(opts.body ?? "");
  });
}

const CALL = JSON.stringify({
  jsonrpc: "2.0",
  id: 7,
  method: "tools/call",
  params: { name: "keyword_trend", arguments: {} },
});

const adapterHeaders = (): Record<string, string> => ({
  host: `127.0.0.1:${port}`,
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
  authorization: `Bearer ${TOKEN}`,
  "x-datalab-mcp-app": "Claude",
});

const reachedHandler = (a: Answer): boolean => a.body.includes('"jsonrpc"');

describe("a web page cannot reach the tools", () => {
  it("a rebinding Host is refused on /mcp and on the panel routes", async () => {
    const mcp = await send("/mcp", {
      headers: { ...adapterHeaders(), host: `rebind.example:${port}` },
      body: CALL,
    });
    expect(mcp.status).toBe(403);
    expect(reachedHandler(mcp)).toBe(false);
    const hello = await send("/bridge/hello", {
      headers: {
        host: `rebind.example:${port}`,
        "content-type": "application/json",
      },
      body: "{}",
    });
    expect(hello.status).toBe(403);
  });

  it("a Host on another port is refused", async () => {
    const mcp = await send("/mcp", {
      headers: { ...adapterHeaders(), host: `127.0.0.1:${port + 1}` },
      body: CALL,
    });
    expect(mcp.status).toBe(403);
  });

  it("a page Origin or an opaque one is refused on /mcp and its notifications", async () => {
    for (const origin of [PAGE_ORIGIN, "null"]) {
      const mcp = await send("/mcp", {
        headers: { ...adapterHeaders(), origin },
        body: CALL,
      });
      expect(mcp.status).toBe(403);
      expect(reachedHandler(mcp)).toBe(false);
      const sub = await send("/mcp/notifications", {
        method: "GET",
        headers: { host: `127.0.0.1:${port}`, origin },
      });
      expect(sub.status).toBe(403);
    }
  });

  it("a body a page can post without a preflight is refused before it is read", async () => {
    for (const type of [
      "text/plain;charset=UTF-8",
      "application/x-www-form-urlencoded",
      "multipart/form-data; boundary=x",
    ]) {
      const mcp = await send("/mcp", {
        headers: { ...adapterHeaders(), "content-type": type, accept: "*/*" },
        body: CALL,
      });
      expect(mcp.status).toBe(415);
      expect(reachedHandler(mcp)).toBe(false);
    }
    const untyped = await send("/mcp", {
      headers: { host: `127.0.0.1:${port}`, accept: "*/*" },
      body: CALL,
    });
    expect(untyped.status).toBe(415);
  });

  it("no answer on /mcp carries a CORS grant", async () => {
    for (const method of ["OPTIONS", "POST"]) {
      const a = await send("/mcp", {
        method,
        headers: {
          ...adapterHeaders(),
          origin: PAGE_ORIGIN,
          "access-control-request-method": "POST",
        },
        body: method === "POST" ? CALL : "",
      });
      expect(a.headers["access-control-allow-origin"]).toBeUndefined();
    }
  });
});

describe("local clients are unchanged", () => {
  it("a 1.18.2 adapter request is served", async () => {
    const a = await send("/mcp", { headers: adapterHeaders(), body: CALL });
    expect(a.status).toBe(200);
    expect(reachedHandler(a)).toBe(true);
  });

  it("localhost, any letter case, and a charset parameter are served", async () => {
    const a = await send("/mcp", {
      headers: {
        ...adapterHeaders(),
        host: `LocalHost:${port}`,
        "content-type": "application/json; charset=utf-8",
      },
      body: CALL,
    });
    expect(a.status).toBe(200);
  });

  it("the panel's own Origin is served on /mcp", async () => {
    const a = await send("/mcp", {
      headers: { ...adapterHeaders(), origin: EXT_ORIGIN },
      body: CALL,
    });
    expect(a.status).toBe(200);
  });

  it("the panel hello still pairs, with no Origin as the service worker sends it", async () => {
    const a = await send("/bridge/hello", {
      headers: {
        host: `127.0.0.1:${port}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        t: "hello",
        protocolVersions: [1],
        extensionVersion: "1.1.32",
        token: TOKEN,
        extensionId: EXT_ID,
        browserId: "brw-a",
        capabilities: [...REQUIRED_BROWSER_CAPABILITIES],
      }),
    });
    expect(a.status).toBe(200);
    expect(JSON.parse(a.body)).toMatchObject({ t: "hello_ack" });
  });

  it("the health route answers whatever the Host, so the panel can tell who holds the port", async () => {
    const a = await send("/bridge/health", {
      method: "GET",
      headers: { host: `rebind.example:${port}` },
    });
    expect(a.status).toBe(200);
  });
});
