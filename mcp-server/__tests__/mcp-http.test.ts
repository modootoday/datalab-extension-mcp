/**
 * The daemon's public JSON-RPC transport, tested against a stubbed bridge so
 * no socket is involved. Pins the two methods' shapes, the error codes, and
 * the content negotiation a streamable-HTTP client depends on.
 */
import { describe, expect, it, vi } from "vitest";
import {
  BRIDGE_LIMITS,
  BRIDGE_USER_MESSAGES,
  agentActionableMessage,
} from "@modootoday/extension-app-mcp-core";

import { Bridge, BridgeError } from "../src/bridge.js";
import { handleMcpRequest, type McpHttpResponse } from "../src/mcp-http.js";

function stubBridge(over: Partial<Bridge>): Bridge {
  return { connected: true, lastKnownTools: [], ...over } as unknown as Bridge;
}

/** Pull the payload back out of whichever framing was negotiated. */
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

  // 🔴 With neither a cache nor a panel, an empty list must NOT be a success:
  // many hosts cache the first list they receive, so a user hitting this on a
  // fresh install would see zero tools until they restart the host.
  it("🔴 캐시도 패널도 없으면 고정 datalab_* 목록을 답한다", async () => {
    // An adapter that starts before the browser caches this first answer, so an
    // empty list — or an error — strands it at zero tools for the session.
    const bridge = stubBridge({ connected: false, lastKnownTools: [] });
    const res = await handleMcpRequest(
      bridge,
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      JSON_ACCEPT,
    );
    const body = decode(res);
    expect(body.error).toBeUndefined();
    const names = (body.result.tools as Array<{ name: string }>).map(
      (t) => t.name,
    );
    expect(names.length).toBeGreaterThan(0);
    expect(names.every((n) => n.startsWith("datalab_"))).toBe(true);
    expect(names).toContain("datalab_catalog");
  });

  it("🔴 연결 중 실패인데 캐시도 없으면 역시 고정 목록이다", async () => {
    // A mid-list drop with no cache falls back to the same fixed facade.
    const bridge = stubBridge({
      lastKnownTools: [],
      listTools: vi.fn().mockRejectedValue(new BridgeError("timeout", "late")),
    });
    const res = await handleMcpRequest(
      bridge,
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      JSON_ACCEPT,
    );
    const body = decode(res);
    expect(body.error).toBeUndefined();
    expect(
      (body.result.tools as Array<{ name: string }>).map((t) => t.name),
    ).toContain("datalab_catalog");
  });

  it("serves the LAST-KNOWN catalog while the panel is disconnected (P1-2)", async () => {
    // A host that cached tools while the panel was up must still see them
    // after it drops, so the daemon serves its cache rather than an empty list.
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
    const callTool = vi
      .fn()
      .mockResolvedValue({ result: { points: [1, 2, 3] }, bridgeMs: 42 });
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
    const callTool = vi.fn().mockResolvedValue({ result: null, bridgeMs: 1 });
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
    // 🔴 A closed panel is recoverable and agent-actionable, so it rides the
    // isError result channel rather than a protocol error, which would read as
    // a broken tool.
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
    // Structured like the success path, so a caller can branch on why.
    const payload = JSON.parse(result.content[0]!.text) as {
      ok: boolean;
      reason: string;
      message: string;
      retryable: boolean;
      retryAfterMs?: number;
    };
    expect(payload.ok).toBe(false);
    expect(payload.reason).toBe("not_connected");
    // 🔴 Carries both the frozen user message and the agent action clause. The
    // wording is quoted in published troubleshooting docs and baked into
    // binaries we cannot reach, so it must survive verbatim.
    expect(payload.message).toBe(agentActionableMessage("not_connected"));
    expect(payload.message).toContain(BRIDGE_USER_MESSAGES.panelClosed);
    // A closed panel needs a person to open it; waiting does not fix it.
    expect(payload.retryable).toBe(false);
    expect(payload.retryAfterMs).toBeUndefined();
  });

  // The one failure that resolves on its own must say how long to wait, or a
  // caller told it is retryable can only guess.
  it("tells a rate-limited caller how long to wait", async () => {
    const bridge = stubBridge({
      callTool: vi
        .fn()
        .mockRejectedValue(
          new BridgeError("rate_limited", BRIDGE_USER_MESSAGES.rateLimited),
        ),
    });
    const res = await handleMcpRequest(
      bridge,
      {
        jsonrpc: "2.0",
        id: 6,
        method: "tools/call",
        params: { name: "keyword_trend", arguments: {} },
      },
      JSON_ACCEPT,
    );
    const result = decode(res).result as {
      content: Array<{ type: string; text: string }>;
      isError: boolean;
    };
    const payload = JSON.parse(result.content[0]!.text) as {
      reason: string;
      retryable: boolean;
      retryAfterMs: number;
    };
    expect(payload.reason).toBe("rate_limited");
    expect(payload.retryable).toBe(true);
    expect(payload.retryAfterMs).toBe(
      Math.ceil(1000 / BRIDGE_LIMITS.refillPerSecond),
    );
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
    // The cache is primed on purpose: the subject here is the framing, and
    // leaving it empty would make this assertion depend on catalog behaviour.
    const bridge = stubBridge({
      connected: false,
      lastKnownTools: [
        { name: "keyword_trend", description: "t", inputSchema: {} },
      ],
    });
    const res = await handleMcpRequest(
      bridge,
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      "application/json, text/event-stream",
    );
    expect(res.headers["content-type"]).toBe("text/event-stream");
    // The decoder asserts the event framing and parses the payload back.
    expect(decode(res).id).toBe(1);
  });

  it("emits plain JSON when the client does not accept SSE", async () => {
    const bridge = stubBridge({
      connected: false,
      lastKnownTools: [
        { name: "keyword_trend", description: "t", inputSchema: {} },
      ],
    });
    const res = await handleMcpRequest(
      bridge,
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      JSON_ACCEPT,
    );
    expect(res.headers["content-type"]).toBe("application/json");
  });
});

/**
 * 🔴 Timing exists for the host, not the model. The result the panel returns is
 * serialized verbatim into a content block the model reads on every call, so a
 * number only an operator needs must never land there — it would be paid for in
 * tokens forever. `_meta` is the MCP result's host-facing channel.
 *
 * Reported apart on purpose: one total cannot tell a slow tool from a slow wire,
 * and that is the question the unattended-automation work is asking.
 */
describe("호출 타이밍", () => {
  const call = async (bridge: ReturnType<typeof stubBridge>) =>
    decode(
      await handleMcpRequest(
        bridge,
        {
          jsonrpc: "2.0",
          id: 9,
          method: "tools/call",
          params: { name: "keyword_trend", arguments: {} },
        },
        JSON_ACCEPT,
      ),
    );

  it("🔴 content 는 타이밍이 없던 때와 바이트 동일하다", async () => {
    const payload = { points: [1, 2, 3] };
    const body = await call(
      stubBridge({
        callTool: vi
          .fn()
          .mockResolvedValue({ result: payload, toolMs: 20, bridgeMs: 55 }),
      }),
    );
    const result = body.result as {
      content: Array<{ type: string; text: string }>;
    };
    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toBe(JSON.stringify(payload));
  });

  it("_meta 에 도구 시간과 전송 시간을 나눠 싣는다", async () => {
    const body = await call(
      stubBridge({
        callTool: vi
          .fn()
          .mockResolvedValue({ result: {}, toolMs: 20, bridgeMs: 55 }),
      }),
    );
    const meta = (body.result as { _meta: Record<string, unknown> })._meta;
    expect(meta).toMatchObject({
      capabilityVersion: "datalab-mcp-timing-v1",
      toolMs: 20,
      bridgeMs: 55,
      transportMs: 35,
    });
  });

  // A pinned panel does not send it; a missing number must not invent one.
  it("패널이 시간을 안 보내면 도구 시간을 지어내지 않는다", async () => {
    const body = await call(
      stubBridge({
        callTool: vi.fn().mockResolvedValue({ result: {}, bridgeMs: 55 }),
      }),
    );
    const meta = (body.result as { _meta: Record<string, unknown> })._meta;
    expect(meta.bridgeMs).toBe(55);
    expect(meta).not.toHaveProperty("toolMs");
    expect(meta).not.toHaveProperty("transportMs");
  });

  /** 🔴 The timing of a call that FAILED is what tells a timeout from a refusal. */
  it("🔴 실패한 호출도 타이밍을 싣는다", async () => {
    const err = new BridgeError(
      "not_connected",
      BRIDGE_USER_MESSAGES.panelClosed,
      { toolMs: 5, bridgeMs: 30 },
    );
    const body = await call(
      stubBridge({ callTool: vi.fn().mockRejectedValue(err) }),
    );
    const result = body.result as {
      isError: boolean;
      _meta: Record<string, unknown>;
    };
    expect(result.isError).toBe(true);
    expect(result._meta).toMatchObject({ toolMs: 5, bridgeMs: 30 });
  });
});
