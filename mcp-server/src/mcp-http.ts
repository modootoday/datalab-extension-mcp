/**
 * MCP over HTTP — the daemon's `POST /mcp` handler, hand-written.
 *
 * Two methods, and only two: `tools/list` and `tools/call`. That is small
 * enough that pulling an MCP server SDK's HTTP transport in would be more
 * surface to audit than the whole handler below, so this speaks JSON-RPC
 * directly and routes each method straight at the bridge.
 *
 * Stateless on purpose: every POST is self-contained, carrying its own id, and
 * nothing is remembered between requests. Multiple hosts share one daemon with
 * no per-session map to keep coherent — correlation lives in the bridge's
 * PendingRegistry, keyed by the request id it mints, not by any client identity
 * this layer would have to track.
 *
 * The result shaping matches the stdio server this daemon replaces, so a host
 * that moved from one to the other sees byte-identical tool results.
 */
import { agentActionableMessage } from "@modootoday/extension-app-mcp-core";

import { BridgeError, type Bridge } from "./bridge.js";

/** A parsed JSON-RPC request as far as this handler cares about it. */
interface JsonRpcRequest {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
}

/** What the node adapter needs to write a response, decoupled from the socket. */
export interface McpHttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

/**
 * JSON-RPC error codes.
 *
 * The three the spec reserves that we actually raise: an unknown method, bad
 * params, and everything else (including a bridge failure). A bridge failure is
 * -32603 rather than a tool-result-with-isError because a host reading raw
 * JSON-RPC over HTTP has no tool-result envelope to unwrap — the error object
 * is the only channel it will render.
 */
const CODE_METHOD_NOT_FOUND = -32601;
const CODE_INVALID_PARAMS = -32602;
const CODE_INTERNAL = -32603;

/**
 * Bridge-failure reasons that are RECOVERABLE by the agent — "open the panel",
 * "wait out the rate limit", "the panel dropped mid-call, try again". These ride
 * the tool-result `isError` channel (below), not a JSON-RPC protocol error,
 * because the model only reads and ACTS on tool-result content; a protocol error
 * reads to the host as "this tool is broken". A genuinely malformed request
 * (unknown method, missing tool name) stays a protocol error — that is what the
 * codes above are for.
 */
function bridgeErrorText(err: BridgeError): string {
  if (err.reason === "not_connected" || err.reason === "rate_limited") {
    return agentActionableMessage(err.reason);
  }
  // timeout / disconnected / superseded / anything else: the bridge already
  // carries a user-facing message; surface it, still on the isError channel so
  // the agent treats it as "retry" rather than "tool is broken".
  return err.message;
}

/** A tool-result that reports failure the way the model reads and acts on it. */
function rpcToolError(id: unknown, text: string): Record<string, unknown> {
  return rpcResult(id, { content: [{ type: "text", text }], isError: true });
}

/**
 * Serialize a JSON-RPC payload for either negotiated response form.
 *
 * A streamable-HTTP client (Cursor) may advertise `text/event-stream`; when it
 * does we answer with a single SSE `data:` event and end, because that is the
 * minimal framing its client accepts. Everyone else gets plain JSON. The status
 * is 200 for both success and JSON-RPC error — the error travels in the body,
 * which is the JSON-RPC contract, not the HTTP status.
 */
export function frameMcpResponse(
  payload: unknown,
  accept: string | undefined,
): McpHttpResponse {
  const json = JSON.stringify(payload);
  const wantsSse = (accept ?? "").includes("text/event-stream");
  if (wantsSse) {
    return {
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      },
      body: `data: ${json}\n\n`,
    };
  }
  return {
    status: 200,
    headers: { "content-type": "application/json" },
    body: json,
  };
}

function rpcResult(id: unknown, result: unknown): Record<string, unknown> {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function rpcError(
  id: unknown,
  code: number,
  message: string,
): Record<string, unknown> {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

/**
 * The pure core: parsed body in, response object out.
 *
 * Injectable without a socket, which is what makes the whole `/mcp` surface
 * unit-testable. The node adapter and `http.ts` both call this; neither owns
 * routing logic of its own.
 */
export async function handleMcpRequest(
  bridge: Bridge,
  body: unknown,
  accept: string | undefined,
): Promise<McpHttpResponse> {
  const req = (
    typeof body === "object" && body !== null ? body : {}
  ) as JsonRpcRequest;
  const id = req.id;
  const method = req.method;

  if (method === "tools/list") {
    // A disconnected panel is the normal state, not a fault — the user may
    // simply not have opened it yet. Serve the LAST-KNOWN catalog (not []): the
    // hosts we target ignore tools/list_changed and cache the first list they
    // get, so [] while the panel is briefly down would strand them empty until
    // they restart. Serving the cache keeps the catalog stable across a flap; a
    // call made while the panel is down still fails through the isError channel.
    if (!bridge.connected) {
      return frameMcpResponse(
        rpcResult(id, { tools: bridge.lastKnownTools }),
        accept,
      );
    }
    try {
      const { tools } = await bridge.listTools();
      return frameMcpResponse(rpcResult(id, { tools }), accept);
    } catch (err) {
      if (err instanceof BridgeError) {
        // The panel dropped mid-list — fall back to the cache rather than
        // yanking the catalog out from under the host.
        return frameMcpResponse(
          rpcResult(id, { tools: bridge.lastKnownTools }),
          accept,
        );
      }
      const message = err instanceof Error ? err.message : String(err);
      return frameMcpResponse(rpcError(id, CODE_INTERNAL, message), accept);
    }
  }

  if (method === "tools/call") {
    const params = (
      typeof req.params === "object" && req.params !== null ? req.params : {}
    ) as { name?: unknown; arguments?: unknown };
    if (typeof params.name !== "string" || params.name.length === 0) {
      return frameMcpResponse(
        rpcError(id, CODE_INVALID_PARAMS, "tools/call requires a tool name."),
        accept,
      );
    }
    const args = (
      typeof params.arguments === "object" && params.arguments !== null
        ? params.arguments
        : {}
    ) as Record<string, unknown>;
    try {
      const result = await bridge.callTool(params.name, args);
      // Shaped exactly as the stdio server shaped it: a single text block
      // carrying the JSON result, so hosts see no difference across transports.
      return frameMcpResponse(
        rpcResult(id, {
          content: [{ type: "text", text: JSON.stringify(result) }],
        }),
        accept,
      );
    } catch (err) {
      // A BridgeError is an execution-time tool failure the agent should ACT on
      // (open the panel, wait out the rate limit, retry the flap) — route it to
      // the isError tool-result channel so the model reads the guidance, not the
      // host's opaque "tool is broken" error rendering. Only an unexpected
      // (non-bridge) error stays a JSON-RPC protocol error.
      if (err instanceof BridgeError) {
        return frameMcpResponse(rpcToolError(id, bridgeErrorText(err)), accept);
      }
      const message = err instanceof Error ? err.message : String(err);
      return frameMcpResponse(rpcError(id, CODE_INTERNAL, message), accept);
    }
  }

  // Unknown or absent method. Within the three codes we raise, method-not-found
  // is the honest fit — there is no fourth method to reach.
  return frameMcpResponse(
    rpcError(
      id,
      CODE_METHOD_NOT_FOUND,
      `Unknown method: ${typeof method === "string" ? method : "(none)"}.`,
    ),
    accept,
  );
}

/**
 * A thin `node:http` adapter around the pure core.
 *
 * Reads the request body (capped), then delegates. `http.ts` routes `/mcp` to
 * `handleMcpRequest` directly so it can apply its own body cap; this adapter
 * exists for standalone use and mirrors the same delegation, so both paths run
 * the identical routing core.
 */
export function createMcpHttpHandler(
  bridge: Bridge,
): (req: McpNodeRequest, res: McpNodeResponse) => void {
  return (req, res) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_MCP_BODY_BYTES) {
        req.destroy();
      } else {
        chunks.push(chunk);
      }
    });
    req.on("end", () => {
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        // A body that will not parse still owes the client a JSON-RPC error,
        // not a bare socket hangup. Route it through as an unparseable request
        // (no method) → method-not-found.
        parsed = null;
      }
      void handleMcpRequest(bridge, parsed, req.headers.accept).then((out) => {
        res.writeHead(out.status, out.headers);
        res.end(out.body);
      });
    });
  };
}

/** Tool-call args are small (read tools take ids and keywords), so this cap is generous. */
export const MAX_MCP_BODY_BYTES = 256 * 1024;

/** The slice of `node:http`'s request this adapter touches — kept structural for tests. */
export interface McpNodeRequest {
  headers: { accept?: string };
  on(event: "data", handler: (chunk: Buffer) => void): void;
  on(event: "end", handler: () => void): void;
  destroy(): void;
}

/** The slice of `node:http`'s response this adapter touches. */
export interface McpNodeResponse {
  writeHead(status: number, headers: Record<string, string>): void;
  end(body: string): void;
}
