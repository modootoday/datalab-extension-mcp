/**
 * Bridge user/agent messages + the isError-channel composition.
 *
 * Guards the split between the frozen user-facing strings and the agent action
 * hint, and the MV3 heartbeat-interval ceiling.
 */
import { describe, expect, it } from "vitest";

import {
  BRIDGE_AGENT_HINT,
  BRIDGE_USER_MESSAGES,
  agentActionableMessage,
} from "../src/messages.js";
import { HEARTBEAT_INTERVAL_MS } from "../src/protocol.js";

describe("agentActionableMessage", () => {
  it("carries BOTH the frozen Korean user line and the English agent hint (not_connected)", () => {
    const text = agentActionableMessage("not_connected");
    // The human still gets the frozen, README-quoted sentence…
    expect(text).toContain(BRIDGE_USER_MESSAGES.panelClosed);
    // …and the model gets the imperative that tells it to act, then retry.
    expect(text).toContain(BRIDGE_AGENT_HINT.notConnected);
    expect(text.toLowerCase()).toContain("call this tool again");
  });

  it("uses the rate-limit pair for rate_limited", () => {
    const text = agentActionableMessage("rate_limited");
    expect(text).toContain(BRIDGE_USER_MESSAGES.rateLimited);
    expect(text).toContain(BRIDGE_AGENT_HINT.rateLimited);
  });

  it("defaults an unknown reason to the not-connected guidance", () => {
    expect(agentActionableMessage("disconnected")).toBe(
      agentActionableMessage("not_connected"),
    );
  });

  it("leaves the frozen user strings untouched (they are the README contract)", () => {
    // Guard against anyone folding the agent hint INTO the frozen object.
    expect(BRIDGE_USER_MESSAGES.panelClosed).not.toContain("call this tool");
  });
});

describe("heartbeat guardrail (P3-2)", () => {
  // The 20s SSE heartbeat is the ONLY thing resetting the MV3 service worker's
  // 30s idle timer for the MCP path (a port no longer keeps it warm on Chrome
  // 114+). Raising it toward/over 30s would let the SW be evicted mid-stream.
  it("stays comfortably under the 30s MV3 idle-eviction window", () => {
    expect(HEARTBEAT_INTERVAL_MS).toBeLessThan(28_000);
  });
});
