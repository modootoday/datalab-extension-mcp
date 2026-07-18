/**
 * Adapter ↔ daemon e2e over real HTTP with a mock daemon.
 *
 * A real `node:http` server on an ephemeral port stands in for the daemon,
 * exposing `POST /mcp` and answering the two JSON-RPC methods with canned
 * results. The adapter's own request handlers are driven through the real global
 * `fetch`, so this exercises the adapter→daemon leg end to end — the default
 * fetch path and the JSON parsing included — while the browser side is faked.
 */
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createAdapterServer } from "../src/adapter.js";

type Handler = (req: unknown, extra: unknown) => Promise<unknown>;

function handlers(
  server: ReturnType<typeof createAdapterServer>,
): Map<string, Handler> {
  return (server as unknown as { _requestHandlers: Map<string, Handler> })
    ._requestHandlers;
}

/** The canned tool the mock daemon reports and echoes a call to. */
const TOOL = { name: "keyword_trend", description: "trend" };

let daemon: HttpServer;
let port: number;

beforeAll(async () => {
  daemon = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
        id: unknown;
        method: string;
        params?: { name?: string; arguments?: unknown };
      };
      let result: unknown;
      if (body.method === "tools/list") {
        result = { tools: [TOOL] };
      } else {
        // Echo the call back so the test can assert the arguments arrived.
        result = {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                called: body.params?.name,
                args: body.params?.arguments,
              }),
            },
          ],
        };
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id: body.id, result }));
    });
  });
  port = await new Promise<number>((resolve) => {
    daemon.listen(0, "127.0.0.1", () => {
      resolve((daemon.address() as AddressInfo).port);
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => daemon.close(() => resolve()));
});

describe("adapter over a real mock daemon", () => {
  it("lists the daemon's tools through the adapter handler", async () => {
    const server = createAdapterServer({ host: "127.0.0.1", port });
    const out = (await handlers(server).get("tools/list")!(
      { method: "tools/list" },
      {},
    )) as { tools: Array<{ name: string }> };
    expect(out.tools).toEqual([TOOL]);
  });

  it("forwards a tool call and returns the daemon's shaped result", async () => {
    const server = createAdapterServer({ host: "127.0.0.1", port });
    const out = (await handlers(server).get("tools/call")!(
      {
        method: "tools/call",
        params: { name: "keyword_trend", arguments: { keyword: "seoul" } },
      },
      {},
    )) as { content: Array<{ text: string }> };
    expect(JSON.parse(out.content[0].text)).toEqual({
      called: "keyword_trend",
      args: { keyword: "seoul" },
    });
  });
});
