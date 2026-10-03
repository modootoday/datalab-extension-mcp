/**
 * Five call sites read the same health document and reached four different
 * verdicts, because the name was a literal each of them retyped.
 */
import { describe, expect, it } from "vitest";

import {
  MCP_SERVER_HEALTH_NAME,
  bridgeUrl,
  isOurConnector,
} from "./identity.js";

describe("connector identity", () => {
  it("accepts our own health document and nothing else", () => {
    expect(isOurConnector({ name: MCP_SERVER_HEALTH_NAME })).toBe(true);
    expect(isOurConnector({ name: "something-else" })).toBe(false);
    expect(isOurConnector({})).toBe(false);
    expect(isOurConnector(null)).toBe(false);
    expect(isOurConnector("datalab-extension-mcp-server")).toBe(false);
  });

  /** A missing version is a separate question from a foreign name. */
  it("does not require a version to recognise the name", () => {
    expect(isOurConnector({ name: MCP_SERVER_HEALTH_NAME })).toBe(true);
  });

  it("builds the loopback url one way", () => {
    expect(bridgeUrl(8765, "/bridge/health")).toBe(
      "http://127.0.0.1:8765/bridge/health",
    );
  });
});
