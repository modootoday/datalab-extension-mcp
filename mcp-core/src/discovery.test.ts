/**
 * The cold catalog is what a host caches when it starts before the browser.
 * Empty or absent there strands the user at zero tools for the session, so the
 * facade must be fully formed without a panel.
 */
import { describe, it, expect } from "vitest";
import {
  CALL_TOOL,
  CATALOG_TOOL,
  CONFIRM_STATUS_TOOL,
  DESCRIBE_TOOL,
  DISCOVERY_TOOLS,
  SESSION_STATE_TOOL,
  discoveryDescriptors,
  isDiscoveryTool,
  sessionStateDescriptor,
  staticDiscoveryCatalog,
} from "./discovery.js";

describe("staticDiscoveryCatalog", () => {
  const tools = staticDiscoveryCatalog();

  it("is never empty and carries exactly the datalab_* facade", () => {
    expect(tools.map((t) => t.name).sort()).toEqual(
      [...DISCOVERY_TOOLS].sort(),
    );
  });

  it("every entry is a usable definition on its own", () => {
    for (const t of tools) {
      expect(t.description.length).toBeGreaterThan(20);
      expect(t.inputSchema).toMatchObject({ type: "object" });
    }
  });

  it("tells the model how to reach the rest, and how many there are", () => {
    const catalog = tools.find((t) => t.name === CATALOG_TOOL)!;
    // The count comes from this build's allowlist, so it is real, not a guess.
    expect(catalog.description).toMatch(/\d+개 도구/);
    const sets = (
      catalog.inputSchema["properties"] as Record<string, { enum?: string[] }>
    )["toolset"]?.enum;
    expect(sets?.length).toBeGreaterThan(1);
  });

  it("names the schema step before the call step", () => {
    const call = tools.find((t) => t.name === CALL_TOOL)!;
    expect(call.description).toContain(DESCRIBE_TOOL);
    expect(call.description).toContain(CATALOG_TOOL);
  });

  it("accepts an explicit selector on every browser-contextual facade", () => {
    for (const name of [
      CATALOG_TOOL,
      DESCRIBE_TOOL,
      CALL_TOOL,
      CONFIRM_STATUS_TOOL,
      SESSION_STATE_TOOL,
    ]) {
      const tool = tools.find((entry) => entry.name === name)!;
      const properties = tool.inputSchema["properties"] as Record<
        string,
        unknown
      >;
      expect(properties).toHaveProperty("browser");
    }
    const call = tools.find((tool) => tool.name === CALL_TOOL)!;
    expect(call.inputSchema["required"]).toEqual(["tool"]);
  });

  it("leaves datalab_call unannotated — its effect is the delegate's", () => {
    const call = tools.find((t) => t.name === CALL_TOOL)!;
    expect(call.annotations).toBeUndefined();
    expect(
      tools.find((t) => t.name === CONFIRM_STATUS_TOOL)!.annotations,
    ).toBeDefined();
  });
});

describe("discoveryDescriptors", () => {
  it("counts the entries it was given", () => {
    const entries = ["a_one", "b_two", "c_three"].map((name) => ({
      name,
      description: "",
      inputSchema: {},
    }));
    expect(discoveryDescriptors(entries)[0]!.description).toContain("3개 도구");
  });
});

describe("isDiscoveryTool", () => {
  it("covers every facade name and nothing else", () => {
    for (const name of DISCOVERY_TOOLS)
      expect(isDiscoveryTool(name)).toBe(true);
    expect(isDiscoveryTool("blog_categories")).toBe(false);
  });

  it("includes the session-state tool the panel answers itself", () => {
    expect(sessionStateDescriptor().name).toBe(SESSION_STATE_TOOL);
    expect(DISCOVERY_TOOLS).toContain(SESSION_STATE_TOOL);
  });
});
