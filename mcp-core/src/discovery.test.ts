/**
 * The cold catalog is what a host caches when it starts before the browser.
 * Empty or absent there strands the user at zero tools for the session, so the
 * facade must be fully formed without a panel.
 */
import { describe, it, expect } from "vitest";
import {
  CALL_TOOL,
  LIST_TOOLS_TOOL,
  CONFIRM_STATUS_TOOL,
  DISCOVERY_TOOLS,
  FIND_TOOLS_TOOL,
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

  it("accepts a bounded natural-language intent without browser context", () => {
    const find = tools.find((tool) => tool.name === FIND_TOOLS_TOOL)!;
    const properties = find.inputSchema["properties"] as Record<
      string,
      { maxLength?: number }
    >;
    expect(properties["intent"]?.maxLength).toBe(256);
    expect(find.inputSchema["required"]).toEqual(["intent"]);
    expect(properties).not.toHaveProperty("browser");
    expect(find.annotations).toMatchObject({ readOnlyHint: true });
  });

  it("names the find step before the call step", () => {
    const call = tools.find((t) => t.name === CALL_TOOL)!;
    expect(call.description).toContain(FIND_TOOLS_TOOL);
    expect(call.description).toContain("스키마");
  });

  it("exposes a schema-free overview selector as the find fallback", () => {
    const catalog = tools.find((tool) => tool.name === LIST_TOOLS_TOOL)!;
    const properties = catalog.inputSchema["properties"] as Record<
      string,
      unknown
    >;
    expect(properties).toHaveProperty("toolset");
    expect(properties).toHaveProperty("page");
    expect(properties).toHaveProperty("pageSize");
    expect(properties["pageSize"]).toMatchObject({ maximum: 20 });
    expect(catalog.inputSchema["required"]).toBeUndefined();
    expect(catalog.annotations).toMatchObject({ readOnlyHint: true });
  });

  it("accepts an explicit selector on every browser-contextual facade", () => {
    for (const name of [CALL_TOOL, CONFIRM_STATUS_TOOL, SESSION_STATE_TOOL]) {
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
  it("publishes only the current four panel-routed definitions", () => {
    expect(discoveryDescriptors().map((tool) => tool.name)).toEqual([
      FIND_TOOLS_TOOL,
      LIST_TOOLS_TOOL,
      CALL_TOOL,
      CONFIRM_STATUS_TOOL,
    ]);
  });
});

describe("isDiscoveryTool", () => {
  it("covers every facade name and nothing else", () => {
    for (const name of DISCOVERY_TOOLS)
      expect(isDiscoveryTool(name)).toBe(true);
    expect(isDiscoveryTool("blog_categories")).toBe(false);
    expect(isDiscoveryTool("datalab_catalog")).toBe(false);
    expect(isDiscoveryTool("datalab_describe")).toBe(false);
  });

  it("includes the session-state tool the panel answers itself", () => {
    expect(sessionStateDescriptor().name).toBe(SESSION_STATE_TOOL);
    expect(DISCOVERY_TOOLS).toContain(SESSION_STATE_TOOL);
  });
});
