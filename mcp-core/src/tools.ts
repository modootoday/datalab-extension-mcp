/**
 * Tool projection — bridge descriptor to MCP tool.
 *
 * The server authors no schemas and holds no catalog; it relays whatever the
 * extension serves, so a tool added in the side panel needs no server release.
 *
 * This module enforces FORM, not MEMBERSHIP. Which names are permitted is
 * catalog knowledge, and a copy here would freeze into every shipped binary.
 * Membership is enforced extension-side, where the session and execution live.
 */
import { MCP_TOOL_NAME_RE, type BridgeToolDescriptor } from "./protocol.js";

/**
 * Upper bound on how many descriptors one catalog may carry — a payload sanity
 * cap, not policy. A catalog orders of magnitude past the real one is a
 * malfunctioning peer, and forwarding it hands the host an unbounded prompt.
 */
export const MAX_CATALOG_SIZE = 512;

/**
 * An MCP tool definition as a host receives it. Declared structurally rather
 * than imported from the MCP SDK: this package must stay buildable for the
 * browser side of the bridge, which has no business pulling a server SDK.
 */
export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /**
   * Tier-derived hints, forwarded untouched when the extension sent them.
   *
   * Absent and empty mean different things on the wire: absent is "we were
   * not told", empty would be a claim. Optional, so neither is manufactured.
   */
  annotations?: Record<string, unknown>;
}

export type ProjectOutcome =
  | { ok: true; tool: McpTool }
  | {
      ok: false;
      reason: "bad_name" | "bad_schema";
      message: string;
    };

/**
 * Project one descriptor, rejecting anything a host would choke on. Protocol
 * conformance only — see the module doc for why there is no membership check.
 */
export function projectTool(d: BridgeToolDescriptor): ProjectOutcome {
  if (!MCP_TOOL_NAME_RE.test(d.name)) {
    return {
      ok: false,
      reason: "bad_name",
      message: `Tool name "${d.name}" does not match ${MCP_TOOL_NAME_RE.source}.`,
    };
  }
  // A host sends the input schema to the model verbatim. A non-object becomes
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
      // Re-assembly, not spread: naming each field keeps a malformed peer
      // from smuggling extra keys into a host payload, but it also drops any
      // new descriptor field in silence. Add future fields HERE too.
      ...(d.annotations ? { annotations: d.annotations } : {}),
    },
  };
}

/**
 * Project a list, dropping (not throwing on) rejects: one malformed descriptor
 * must not deny the user their other tools. A catalog over MAX_CATALOG_SIZE is
 * the one whole-list refusal — that is a bad peer, not a bad entry.
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
