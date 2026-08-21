/** Stateless MCP request handling over the daemon's loopback transport. */
import {
  agentActionableMessage,
  policyFor,
  staticDiscoveryCatalog,
  BROWSERS_TOOL,
  CALL_TOOL,
  CATALOG_TOOL,
  CONFIRM_STATUS_TOOL,
  DESCRIBE_TOOL,
  SESSION_STATE_TOOL,
  type McpTool,
} from "@modootoday/extension-app-mcp-core";

import { BridgeError, type Bridge } from "./bridge.js";
import type { MediaStage } from "./media-stage.js";
import {
  callMediaTool,
  isMediaTool,
  mediaToolDescriptors,
} from "./media-tools.js";

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
 * The three reserved JSON-RPC codes we raise. A bridge failure uses the
 * internal code rather than an isError tool result because a host reading raw
 * JSON-RPC has no tool-result envelope to unwrap.
 */
const CODE_METHOD_NOT_FOUND = -32601;
const CODE_INVALID_PARAMS = -32602;
const CODE_INTERNAL = -32603;

/**
 * Text for a bridge failure the agent can recover from. These ride the isError
 * tool-result channel rather than a protocol error, because a model reads and
 * acts on tool-result content while a protocol error reads as a broken tool.
 * A malformed request stays a protocol error — that is what the codes are for.
 */
function bridgeErrorText(err: BridgeError): string {
  if (err.reason === "not_connected" || err.reason === "rate_limited") {
    return agentActionableMessage(err.reason);
  }
  // Every other reason already carries a user-facing message of its own.
  return err.message;
}

/**
 * A tool result that reports failure the way a model reads and acts on it.
 *
 * Structured, matching the success path, so a caller can branch on WHY a
 * call failed.  The message still carries the frozen user-facing sentence —
 * it is quoted in the published troubleshooting docs — now beside a code a
 * machine can act on rather than instead of one.
 */
/**
 * Per-call timing, carried on `_meta` rather than in the payload.
 *
 * `_meta` is where the MCP result keeps host-facing data: the host reads it,
 * the model does not. The payload beside it becomes a content block the model
 * reads on every call, so a number only an operator needs must never live
 * there. Bumping CAPABILITY lets a host tell a build that reports timing from
 * one that never will, without probing for field presence.
 */
const CAPABILITY = "datalab-mcp-timing-v1";

function timingMeta(timing: {
  toolMs?: number;
  bridgeMs: number;
}): Record<string, unknown> {
  return {
    _meta: {
      capabilityVersion: CAPABILITY,
      bridgeMs: timing.bridgeMs,
      ...(timing.toolMs === undefined ? {} : { toolMs: timing.toolMs }),
      // What the wire and the queue cost, which is the whole reason the two
      // numbers are reported apart.
      ...(timing.toolMs === undefined
        ? {}
        : { transportMs: Math.max(0, timing.bridgeMs - timing.toolMs) }),
    },
  };
}

/** The daemon's own tools, or none when this build has no stage. */
type ToolRecord = McpTool | Record<string, unknown>;
const ROUTED_FACADES = new Set([
  CATALOG_TOOL,
  DESCRIBE_TOOL,
  CALL_TOOL,
  CONFIRM_STATUS_TOOL,
  SESSION_STATE_TOOL,
]);

function ownTools(stage: MediaStage | undefined): ToolRecord[] {
  const browsers = staticDiscoveryCatalog().find(
    (tool) => tool.name === BROWSERS_TOOL,
  );
  return [
    ...(browsers ? [browsers] : []),
    ...(stage ? mediaToolDescriptors() : []),
  ];
}

function withOwnTools(
  tools: readonly ToolRecord[],
  stage: MediaStage | undefined,
): ToolRecord[] {
  const canonical = new Map(
    staticDiscoveryCatalog().map((tool) => [tool.name, tool]),
  );
  const out = tools.map((tool) => {
    const name = typeof tool["name"] === "string" ? tool["name"] : "";
    const facade = canonical.get(name);
    if (!facade || !ROUTED_FACADES.has(name)) return tool;
    return { ...tool, inputSchema: facade.inputSchema };
  });
  const names = new Set(
    out.flatMap((tool) =>
      typeof tool["name"] === "string" ? [tool["name"]] : [],
    ),
  );
  for (const tool of ownTools(stage)) {
    if (typeof tool["name"] !== "string" || names.has(tool["name"])) continue;
    names.add(tool["name"]);
    out.push(tool);
  }
  return out;
}

function rpcToolError(id: unknown, err: BridgeError): Record<string, unknown> {
  const policy = policyFor(err.reason);
  const payload = {
    ok: false as const,
    reason: err.reason,
    message: bridgeErrorText(err),
    retryable: policy.retryable,
    ...(policy.retryAfterMs === undefined
      ? {}
      : { retryAfterMs: policy.retryAfterMs }),
  };
  return rpcResult(id, {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    isError: true,
    ...(err.timing ? timingMeta(err.timing) : {}),
  });
}

/**
 * Serialize a JSON-RPC payload for either negotiated response form. A client
 * advertising an event stream gets a single SSE event, the minimal framing
 * such a client accepts; everyone else gets plain JSON. The status is 200 for
 * errors too — in JSON-RPC the error travels in the body, not the status.
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

/**
 * What to serve when the panel cannot be asked.
 *
 * The façade when the panel has never been heard from, NOT merely when there
 * is nothing else to send. That distinction was the bug: the guard also required
 * the daemon's own tools to be empty, and once the media staging tools existed
 * that was never true again — so a host connecting before the browser was handed
 * FOUR tools and cached them for the session.
 *
 * Never an empty list and never an error, because hosts cache the first list
 * they receive and nothing on our side can undo that for the session. The
 * façade's five names and schemas do not vary; the daemon's own tools ride
 * along either way, so a cold host is handed nine. Only the façade half is
 * replaced on connect, via notifications/tools/list_changed.
 */
function offlineCatalog(
  bridge: Bridge,
  stage: MediaStage | undefined,
  id: unknown,
  accept: string | undefined,
): McpHttpResponse {
  const base =
    bridge.lastKnownTools.length > 0
      ? bridge.lastKnownTools
      : staticDiscoveryCatalog();
  return frameMcpResponse(
    rpcResult(id, { tools: withOwnTools(base, stage) }),
    accept,
  );
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
 * The pure core: parsed body in, response object out, no socket involved. Both
 * the node adapter and the HTTP surface call this, so neither owns routing.
 */
export async function handleMcpRequest(
  bridge: Bridge,
  body: unknown,
  accept: string | undefined,
  /**
   * The daemon answers the staging tools itself, because it owns the disk
   * they write to. Absent means this build has no stage, and then the names do
   * not exist at all — a tool that cannot work must not be advertised.
   */
  stage?: MediaStage,
): Promise<McpHttpResponse> {
  const req = (
    typeof body === "object" && body !== null ? body : {}
  ) as JsonRpcRequest;
  const id = req.id;
  const method = req.method;

  if (method === "tools/list") {
    // A disconnected panel is the normal state, not a fault. Serving the
    // last-known catalog keeps it stable across a flap; a call made while the
    // panel is down still fails through the isError channel.
    if (!bridge.connected) {
      // The staging tools do not need the panel and must not disappear with
      // it — an unattended run keeps staging bytes while no browser is open.
      return offlineCatalog(bridge, stage, id, accept);
    }
    try {
      const { tools } = await bridge.listTools();
      return frameMcpResponse(
        rpcResult(id, { tools: withOwnTools(tools, stage) }),
        accept,
      );
    } catch (err) {
      if (err instanceof BridgeError) {
        // The panel dropped mid-list — fall back to the cache rather than
        // yanking the catalog out from under the host.
        // The staging tools survive a closed panel, because they never
        // needed it. An unattended run can keep staging bytes and only wants a
        // browser later, for the editor.
        return offlineCatalog(bridge, stage, id, accept);
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
    let args = (
      typeof params.arguments === "object" && params.arguments !== null
        ? params.arguments
        : {}
    ) as Record<string, unknown>;
    let browser: string | undefined;
    if (ROUTED_FACADES.has(params.name) && Object.hasOwn(args, "browser")) {
      if (
        typeof args["browser"] !== "string" ||
        args["browser"].length === 0 ||
        args["browser"] !== args["browser"].trim()
      ) {
        return frameMcpResponse(
          rpcError(
            id,
            CODE_INVALID_PARAMS,
            "browser must be a connected browser id.",
          ),
          accept,
        );
      }
      browser = args["browser"];
      args = { ...args };
      delete args["browser"];
    }
    // Answered here, never forwarded: only the daemon holds the session map,
    // and a panel can only ever describe itself. What it reports is who is
    // attached right now -- the only browsers a call can actually reach.
    if (params.name === BROWSERS_TOOL) {
      return frameMcpResponse(
        rpcResult(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify({ browsers: bridge.connectedBrowsers() }),
            },
          ],
        }),
        accept,
      );
    }
    // Answered here, never forwarded: the panel does not own this disk.
    if (stage && isMediaTool(params.name)) {
      const startedAt = Date.now();
      const result = await callMediaTool(stage, params.name, args);
      return frameMcpResponse(
        rpcResult(id, {
          content: [{ type: "text", text: JSON.stringify(result) }],
          ...timingMeta({
            toolMs: Date.now() - startedAt,
            bridgeMs: Date.now() - startedAt,
          }),
        }),
        accept,
      );
    }

    try {
      const call =
        browser === undefined
          ? await bridge.callTool(params.name, args)
          : await bridge.callTool(params.name, args, browser);
      // A single text block carrying the JSON result, so a host sees the same
      // shape whichever transport it arrived on. Timing rides on _meta, so the
      // content block is byte-for-byte what it was before timing existed.
      return frameMcpResponse(
        rpcResult(id, {
          content: [{ type: "text", text: JSON.stringify(call.result) }],
          ...timingMeta(call),
        }),
        accept,
      );
    } catch (err) {
      // A bridge failure is something the agent should act on, so it goes to
      // the isError channel where the model reads the guidance rather than a
      // broken-tool rendering. Anything else stays a protocol error.
      if (err instanceof BridgeError) {
        return frameMcpResponse(rpcToolError(id, err), accept);
      }
      const message = err instanceof Error ? err.message : String(err);
      return frameMcpResponse(rpcError(id, CODE_INTERNAL, message), accept);
    }
  }

  // Unknown or absent method — there is no third method to reach.
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
 * A thin node:http adapter around the pure core: read the body under a cap,
 * then delegate. Exists for standalone use; the daemon's own surface applies
 * its own cap and calls the same core, so both paths route identically.
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
        // A body that will not parse still owes the client a JSON-RPC error
        // rather than a bare socket hangup; a null body becomes
        // method-not-found.
        parsed = null;
      }
      void handleMcpRequest(bridge, parsed, req.headers.accept).then((out) => {
        res.writeHead(out.status, out.headers);
        res.end(out.body);
      });
    });
  };
}

/** Tool-call args are ids and keywords, so this cap is generous. */
export const MAX_MCP_BODY_BYTES = 256 * 1024;

/** The slice of node:http's request this adapter touches — structural for tests. */
export interface McpNodeRequest {
  headers: { accept?: string };
  on(event: "data", handler: (chunk: Buffer) => void): void;
  on(event: "end", handler: () => void): void;
  destroy(): void;
}

/** The slice of node:http's response this adapter touches. */
export interface McpNodeResponse {
  writeHead(status: number, headers: Record<string, string>): void;
  end(body: string): void;
}
