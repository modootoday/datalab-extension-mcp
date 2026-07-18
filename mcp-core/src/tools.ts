/**
 * Tool projection — bridge descriptor → MCP `Tool`.
 *
 * The server authors no schemas AND holds no catalog. It relays whatever the
 * extension serves, so a tool added or changed in the side panel needs no
 * server release — which matters more than it sounds, because a pinned server
 * on a user's disk is never updated by us.
 *
 * The boundary this module enforces is FORM, not MEMBERSHIP: the tool-name
 * grammar an MCP host requires, and the descriptor shape a host would choke
 * on. Which names are permitted is catalog knowledge, and catalog knowledge
 * enforced here would be frozen into every shipped binary forever — this
 * module used to hold a copy of the allowlist, and that copy silently dropped
 * every tool added after a given server shipped. The allowlist lives in the
 * extension (`allowlist.ts`, enforced by the panel executor), which is the
 * side that holds the session, executes the call, and auto-updates.
 */
import { MCP_TOOL_NAME_RE, type BridgeToolDescriptor } from "./protocol.js";

/**
 * Upper bound on how many descriptors one catalog may carry.
 *
 * Not a policy list — a payload sanity cap. The panel serves ~130 today; a
 * "catalog" orders of magnitude past that is a malfunctioning or hostile
 * peer, and forwarding it would hand the MCP host an unbounded prompt.
 */
export const MAX_CATALOG_SIZE = 512;

/**
 * An MCP tool definition, as a host receives it.
 *
 * Declared structurally rather than imported from `@modelcontextprotocol/sdk`:
 * this package must stay dependency-light and buildable for the browser side
 * of the bridge, which has no business pulling a server SDK.
 */
export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type ProjectOutcome =
  | { ok: true; tool: McpTool }
  | {
      ok: false;
      reason: "bad_name" | "bad_schema";
      message: string;
    };

/**
 * Project one descriptor, rejecting anything a host would choke on.
 *
 * Protocol conformance only. There is deliberately NO allowlist check here —
 * see the module doc for why a server-side membership check was removed
 * (short version: it stopped no attacker the panel's own gate does not stop,
 * and it silently hid every tool newer than the installed server binary).
 */
export function projectTool(d: BridgeToolDescriptor): ProjectOutcome {
  if (!MCP_TOOL_NAME_RE.test(d.name)) {
    return {
      ok: false,
      reason: "bad_name",
      message: `Tool name "${d.name}" does not match ${MCP_TOOL_NAME_RE.source}.`,
    };
  }
  // A host sends `inputSchema` to the model verbatim. A non-object here becomes
  // a malformed request at the provider, surfacing far from the cause.
  if (
    typeof d.inputSchema !== "object" ||
    d.inputSchema === null ||
    Array.isArray(d.inputSchema)
  ) {
    return {
      ok: false,
      reason: "bad_schema",
      message: `Tool "${d.name}" has a non-object inputSchema.`,
    };
  }
  return {
    ok: true,
    tool: {
      name: d.name,
      description: d.description,
      inputSchema: d.inputSchema,
    },
  };
}

/**
 * Project a list, dropping (not throwing on) rejects.
 *
 * One malformed descriptor must not deny the user their other tools, so
 * rejects are collected and returned alongside for the operator to see rather
 * than failing the whole handshake. A catalog over MAX_CATALOG_SIZE is the
 * one whole-list refusal — that is not one bad entry, it is a bad peer.
 */
export function projectTools(descriptors: readonly BridgeToolDescriptor[]): {
  tools: McpTool[];
  rejected: Array<{ name: string; reason: string; message: string }>;
} {
  if (descriptors.length > MAX_CATALOG_SIZE) {
    return {
      tools: [],
      rejected: [
        {
          name: "*",
          reason: "catalog_too_large",
          message: `Catalog of ${descriptors.length} exceeds the ${MAX_CATALOG_SIZE} cap.`,
        },
      ],
    };
  }
  const tools: McpTool[] = [];
  const rejected: Array<{ name: string; reason: string; message: string }> = [];
  for (const d of descriptors) {
    const out = projectTool(d);
    if (out.ok) tools.push(out.tool);
    else
      rejected.push({ name: d.name, reason: out.reason, message: out.message });
  }
  return { tools, rejected };
}
