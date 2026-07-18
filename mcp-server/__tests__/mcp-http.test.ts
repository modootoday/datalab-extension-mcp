/**
 * The `/mcp` JSON-RPC handler — the daemon's public transport, tested against a
 * stubbed bridge so no socket is involved. These pin the two methods' shapes,
 * the error codes, and the SSE-vs-JSON content negotiation Cursor depends on.
 */
import { describe, expect, it, vi } from "vitest";
import {
  BRIDGE_USER_MESSAGES,
  agentActionableMessage,
} from "@modootoday/extension-app-mcp-core";

import { Bridge, BridgeError } from "../src/bridge.js";
import { handleMcpRequest, type McpHttpResponse } from "../src/mcp-http.js";

function stubBridge(over: Partial<Bridge>): Bridge {
  return { connected: true, lastKnownTools: [], ...over } as unknown as Bridge;
}

/** Pull the JSON-RPC payload back out of whichever framing was negotiated. */
function decode(res: McpHttpResponse): Record<string, unknown> {
  const contentType = res.headers["content-type"];
  if (contentType === "text/event-stream") {
    expect(res.body.startsWith("data: ")).toBe(true);
    expect(res.body.endsWith("\n\n")).toBe(true);
    return JSON.parse(res.body.slice("data: ".length).trimEnd());
  }
  expect(contentType).toBe("application/json");
  return JSON.parse(res.body);
}

const JSON_ACCEPT = "application/json";

describe("tools/list", () => {
  it("forwards to the bridge and returns the projected tools", async () => {
    const bridge = stubBridge({
      listTools: vi.fn().mockResolvedValue({
        tools: [{ name: "keyword_trend", description: "t", inputSchema: {} }],
        rejected: [],
      }),
    });
    const res = await handleMcpRequest(
      bridge,
      { jsonrpc: "2.0", id: 7, method: "tools/list" },
      JSON_ACCEPT,
    );
    const body = decode(res);
    expect(body.id).toBe(7);
    expect(body.result).toEqual({
      tools: [{ name: "keyword_trend", description: "t", inputSchema: {} }],
    });
  });

  it("serves an empty list when no panel has ever connected (empty cache)", async () => {
    const bridge = stubBridge({ connected: false, lastKnownTools: [] });
    const res = await handleMcpRequest(
      bridge,
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      JSON_ACCEPT,
    );
    expect(decode(res).result).toEqual({ tools: [] });
  });

  it("serves the LAST-KNOWN catalog while the panel is disconnected (P1-2)", async () => {
    // A host that cached tools when the panel was up, then the panel dropped:
    // it must still see the tools (the hosts we target ignore list_changed), so
    // the daemon serves its cache rather than [].
    const cached = [
      { name: "keyword_trend", description: "t", inputSchema: {} },
    ];
    const bridge = stubBridge({ connected: false, lastKnownTools: cached });
    const res = await handleMcpRequest(
      bridge,
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      JSON_ACCEPT,
    );
    expect(decode(res).result).toEqual({ tools: cached });
  });

  it("falls back to the cache when a connected list fails mid-flight", async () => {
    const cached = [{ name: "my_realtime", description: "r", inputSchema: {} }];
    const bridge = stubBridge({
      lastKnownTools: cached,
      listTools: vi
        .fn()
        .mockRejectedValue(new BridgeError("disconnected", "gone")),
    });
    const res = await handleMcpRequest(
      bridge,
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      JSON_ACCEPT,
    );
    expect(decode(res).result).toEqual({ tools: cached });
  });
});

describe("tools/call", () => {
  it("forwards name + args and wraps the result as a text content block", async () => {
    const callTool = vi.fn().mockResolvedValue({ points: [1, 2, 3] });
    const bridge = stubBridge({ callTool });
    const res = await handleMcpRequest(
      bridge,
      {
        jsonrpc: "2.0",
        id: "abc",
        method: "tools/call",
        params: { name: "keyword_trend", arguments: { keyword: "커피" } },
      },
      JSON_ACCEPT,
    );
    expect(callTool).toHaveBeenCalledWith("keyword_trend", { keyword: "커피" });
    const body = decode(res);
    expect(body.id).toBe("abc");
    const result = body.result as {
      content: Array<{ type: string; text: string }>;
    };
    expect(result.content[0].type).toBe("text");
    expect(JSON.parse(result.content[0].text)).toEqual({ points: [1, 2, 3] });
  });

  it("defaults missing arguments to an empty object", async () => {
    const callTool = vi.fn().mockResolvedValue(null);
    const bridge = stubBridge({ callTool });
    await handleMcpRequest(
      bridge,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "my_realtime" },
      },
      JSON_ACCEPT,
    );
    expect(callTool).toHaveBeenCalledWith("my_realtime", {});
  });

  it("routes a not_connected BridgeError to the isError tool-result channel (P1-1)", async () => {
    // A closed panel is a recoverable, agent-actionable condition — it must ride
    // the isError result channel (which the model reads and acts on), NOT a
    // JSON-RPC protocol error (which reads as "tool is broken").
    const bridge = stubBridge({
      callTool: vi
        .fn()
        .mockRejectedValue(
          new BridgeError("not_connected", BRIDGE_USER_MESSAGES.panelClosed),
        ),
    });
    const res = await handleMcpRequest(
      bridge,
      {
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: { name: "keyword_trend", arguments: {} },
      },
      JSON_ACCEPT,
    );
    const body = decode(res);
    expect(body.error).toBeUndefined();
    const result = body.result as {
      content: Array<{ type: string; text: string }>;
      isError: boolean;
    };
    expect(result.isError).toBe(true);
    // Carries the frozen Korean user message AND the English agent action clause.
    expect(result.content[0].text).toBe(
      agentActionableMessage("not_connected"),
    );
    expect(result.content[0].text).toContain(BRIDGE_USER_MESSAGES.panelClosed);
  });

  it("keeps an UNEXPECTED (non-bridge) error as a -32603 protocol error", async () => {
    const bridge = stubBridge({
      callTool: vi.fn().mockRejectedValue(new Error("boom")),
    });
    const res = await handleMcpRequest(
      bridge,
      {
        jsonrpc: "2.0",
        id: 9,
        method: "tools/call",
        params: { name: "keyword_trend", arguments: {} },
      },
      JSON_ACCEPT,
    );
    expect((decode(res).error as { code: number }).code).toBe(-32603);
  });

  it("rejects a call with no tool name as invalid params (-32602)", async () => {
    const bridge = stubBridge({ callTool: vi.fn() });
    const res = await handleMcpRequest(
      bridge,
      { jsonrpc: "2.0", id: 1, method: "tools/call", params: {} },
      JSON_ACCEPT,
    );
    expect((decode(res).error as { code: number }).code).toBe(-32602);
  });
});

describe("routing + framing", () => {
  it("answers an unknown method with -32601", async () => {
    const res = await handleMcpRequest(
      stubBridge({}),
      { jsonrpc: "2.0", id: 1, method: "resources/list" },
      JSON_ACCEPT,
    );
    expect((decode(res).error as { code: number }).code).toBe(-32601);
  });

  it("answers an absent method with -32601", async () => {
    const res = await handleMcpRequest(stubBridge({}), {}, JSON_ACCEPT);
    expect((decode(res).error as { code: number }).code).toBe(-32601);
  });

  it("emits a single SSE data frame when the client accepts text/event-stream", async () => {
    const bridge = stubBridge({ connected: false });
    const res = await handleMcpRequest(
      bridge,
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      "application/json, text/event-stream",
    );
    expect(res.headers["content-type"]).toBe("text/event-stream");
    // decode() asserts the `data: …\n\n` framing and parses the payload back.
    expect(decode(res).result).toEqual({ tools: [] });
  });

  it("emits plain JSON when the client does not accept SSE", async () => {
    const bridge = stubBridge({ connected: false });
    const res = await handleMcpRequest(
      bridge,
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      JSON_ACCEPT,
    );
    expect(res.headers["content-type"]).toBe("application/json");
  });
});
