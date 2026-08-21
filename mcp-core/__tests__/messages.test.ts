/**
 * Guards the split between the frozen user-facing strings and the agent action
 * hint, plus the service-worker heartbeat ceiling.
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
    // The human still gets the frozen, documentation-quoted sentence...
    expect(text).toContain(BRIDGE_USER_MESSAGES.panelClosed);
    // ...and the model gets the imperative that tells it to act, then retry.
    expect(text).toContain(BRIDGE_AGENT_HINT.notConnected);
    expect(text.toLowerCase()).toContain("call this tool again");
  });

  it("uses the rate-limit pair for rate_limited", () => {
    const text = agentActionableMessage("rate_limited");
    expect(text).toContain(BRIDGE_USER_MESSAGES.rateLimited);
    expect(text).toContain(BRIDGE_AGENT_HINT.rateLimited);
  });

  it("defaults an unknown reason to the not-connected guidance", () => {
    expect(agentActionableMessage("a_reason_from_a_newer_panel")).toBe(
      agentActionableMessage("not_connected"),
    );
  });

  it("leaves the frozen user strings untouched (they are the README contract)", () => {
    // Guards against folding the agent hint into the frozen object.
    expect(BRIDGE_USER_MESSAGES.panelClosed).not.toContain("call this tool");
  });
});

describe("heartbeat guardrail (P3-2)", () => {
  // The heartbeat is the only thing resetting the service worker's idle
  // timer on this path; raising it toward that timeout allows eviction
  // mid-stream.
  it("stays comfortably under the 30s MV3 idle-eviction window", () => {
    expect(HEARTBEAT_INTERVAL_MS).toBeLessThan(28_000);
  });
});
