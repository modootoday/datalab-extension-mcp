import { describe, expect, it } from "vitest";

import { appHeader } from "../src/adapter.js";

describe("the AI app header", () => {
  it("names the app from its initialize", () => {
    expect(appHeader("claude-code")).toEqual({
      "x-datalab-mcp-app": "claude-code",
    });
  });

  it("is left out when the app sent no name", () => {
    expect(appHeader(undefined)).toEqual({});
    expect(appHeader("   ")).toEqual({});
  });

  it("keeps only printable ASCII so fetch never throws on the header", () => {
    expect(appHeader("커서 Cursor\n")).toEqual({
      "x-datalab-mcp-app": "Cursor",
    });
  });

  it("is cut to the length the daemon keeps", () => {
    expect(appHeader("a".repeat(200))["x-datalab-mcp-app"]).toHaveLength(64);
  });
});
