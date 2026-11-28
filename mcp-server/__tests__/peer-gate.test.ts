import { request } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";

import { Bridge } from "../src/bridge.js";
import { createHttpBridge, type HttpBridge } from "../src/http.js";
import type { PeerVerdict } from "../src/peer-owner/index.js";

const TOKEN = "k".repeat(64);
const EXT_ID = "abcdefghijklmnopabcdefghijklmnop";

let http: HttpBridge | null = null;

afterEach(async () => {
  await http?.close();
  http = null;
});

async function start(
  verdict: PeerVerdict,
  calls: { count: number },
  logs: string[],
): Promise<number> {
  const bridge: Bridge = new Bridge({
    send: (frame, key) => http?.send(frame, key) ?? false,
    token: TOKEN,
    extensionIds: [EXT_ID],
    serverVersion: "0.0.1-test",
    log: () => {},
  });
  http = createHttpBridge({
    bridge,
    port: 0,
    identity: { name: "datalab-extension-mcp-server", version: "0.0.1-test" },
    log: (line) => logs.push(line),
    peerOwner: () => {
      calls.count += 1;
      return Promise.resolve(verdict);
    },
  });
  await new Promise<void>((r) => http?.server.listen(0, "127.0.0.1", r));
  return (http.server.address() as AddressInfo).port;
}

function send(
  port: number,
  path: string,
  method: string,
  body = "",
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: "127.0.0.1",
        port,
        path,
        method,
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
      },
      (res) => {
        let text = "";
        res.on("data", (c: Buffer) => (text += c.toString("utf8")));
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, body: text }),
        );
      },
    );
    req.on("error", reject);
    req.end(body);
  });
}

const HELLO = JSON.stringify({
  t: "hello",
  protocolVersions: [1],
  token: TOKEN,
  extensionId: EXT_ID,
});
const LIST = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" });

describe("peer account gate", () => {
  it("answers a hello from another account with forbidden_peer and logs why", async () => {
    const logs: string[] = [];
    const port = await start({ kind: "other" }, { count: 0 }, logs);
    const res = await send(port, "/bridge/hello", "POST", HELLO);
    expect(res.status).toBe(403);
    expect(JSON.parse(res.body)).toMatchObject({
      t: "hello_nack",
      reason: "forbidden_peer",
    });
    expect(
      logs.some((line) => line.includes("peer belongs to another account")),
    ).toBe(true);
  });

  it("answers a hello whose owner is unknown with peer_unverified", async () => {
    const port = await start(
      { kind: "unknown", cause: "proc unreadable" },
      { count: 0 },
      [],
    );
    const res = await send(port, "/bridge/hello", "POST", HELLO);
    expect(res.status).toBe(403);
    expect(JSON.parse(res.body)).toMatchObject({
      t: "hello_nack",
      reason: "peer_unverified",
    });
  });

  it("refuses the MCP route to another account before reading the call", async () => {
    const port = await start({ kind: "other" }, { count: 0 }, []);
    const res = await send(port, "/mcp", "POST", LIST);
    expect(res.status).toBe(403);
    expect(JSON.parse(res.body)).toEqual({ error: "forbidden_peer" });
  });

  it("serves the MCP route to this account", async () => {
    const port = await start({ kind: "own" }, { count: 0 }, []);
    const res = await send(port, "/mcp", "POST", LIST);
    expect(res.status).toBe(200);
  });

  it("leaves the health route open without a lookup", async () => {
    const calls = { count: 0 };
    const port = await start({ kind: "other" }, calls, []);
    const res = await send(port, "/bridge/health", "GET");
    expect(res.status).toBe(200);
    expect(calls.count).toBe(0);
  });
});
