import { describe, expect, it } from "vitest";

import { MAX_CATALOG_SIZE, projectTool, projectTools } from "../src/tools.js";
import type { BridgeToolDescriptor } from "../src/protocol.js";

const good: BridgeToolDescriptor = {
  name: "keyword_trend",
  description: "Keyword search-volume trend over time.",
  inputSchema: { type: "object", properties: { keyword: { type: "string" } } },
};

describe("projectTool", () => {
  it("passes an allowed, well-formed tool through unchanged", () => {
    const out = projectTool(good);
    expect(out).toEqual({
      ok: true,
      tool: {
        name: good.name,
        description: good.description,
        inputSchema: good.inputSchema,
      },
    });
  });

  // The drop this catches is silent: projection names its fields rather
  // than spreading, so a field added upstream vanishes with no error anywhere.
  // Any future descriptor field needs a line here and a case below.
  it("forwards annotations instead of dropping them in re-assembly", () => {
    const annotations = { readOnlyHint: true, "x-datalab-tier": "read" };
    const out = projectTool({ ...good, annotations });
    expect(out.ok).toBe(true);
    expect(out.ok && out.tool.annotations).toEqual(annotations);
  });

  // Absent and empty are different claims: absent means we were not told,
  // empty would assert the tool has no hints.
  it("omits the annotations key entirely when the descriptor has none", () => {
    const out = projectTool(good);
    expect(out.ok && "annotations" in out.tool).toBe(false);
  });

  // The version marker rides inside the input schema because top-level
  // fields do not survive this function.
  it("carries x-schema-version through, since it lives inside inputSchema", () => {
    const inputSchema = { ...good.inputSchema, "x-schema-version": 1 };
    const out = projectTool({ ...good, inputSchema });
    expect(out.ok && out.tool.inputSchema["x-schema-version"]).toBe(1);
  });

  // Projection checks form, not membership, so an unheard-of name must
  // pass: membership frozen into a shipped binary would hide every tool newer
  // than it. The gate lives in the panel executor, which auto-updates.
  it("passes a name it has never heard of (no membership check)", () => {
    const out = projectTool({ ...good, name: "tool_from_the_future" });
    expect(out.ok).toBe(true);
  });

  it("rejects a name that violates the MCP name grammar", () => {
    const out = projectTool({ ...good, name: "keyword trend" });
    expect(out).toMatchObject({ ok: false, reason: "bad_name" });
  });

  it.each([
    ["null", null],
    ["an array", []],
    ["a string", "object"],
    ["a number", 1],
  ])("rejects %s inputSchema", (_label, schema) => {
    const out = projectTool({ ...good, inputSchema: schema as never });
    expect(out).toMatchObject({ ok: false, reason: "bad_schema" });
  });

  it("accepts an empty object schema", () => {
    const out = projectTool({ ...good, inputSchema: {} });
    expect(out.ok).toBe(true);
  });

  it("names the offending tool in the message", () => {
    const out = projectTool({ ...good, name: "bad name!" });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.message).toContain("bad name!");
  });
});

describe("projectTools", () => {
  it("splits a mixed list into tools and rejects", () => {
    const { tools, rejected } = projectTools([
      good,
      { ...good, name: "이름 문법 위반" },
      { ...good, name: "my_realtime" },
    ]);
    expect(tools.map((t) => t.name)).toEqual(["keyword_trend", "my_realtime"]);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({
      name: "이름 문법 위반",
      reason: "bad_name",
    });
  });

  // The one whole-list refusal: a catalog past the cap is a bad peer, not a
  // bad entry.
  it("refuses a catalog over the size cap outright", () => {
    const flood = Array.from({ length: MAX_CATALOG_SIZE + 1 }, (_, i) => ({
      ...good,
      name: `tool_${i}`,
    }));
    const { tools, rejected } = projectTools(flood);
    expect(tools).toEqual([]);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({ reason: "catalog_too_large" });
  });

  it("accepts a catalog exactly at the cap", () => {
    const full = Array.from({ length: MAX_CATALOG_SIZE }, (_, i) => ({
      ...good,
      name: `tool_${i}`,
    }));
    const { tools, rejected } = projectTools(full);
    expect(tools).toHaveLength(MAX_CATALOG_SIZE);
    expect(rejected).toEqual([]);
  });

  // One malformed descriptor must not deny the user their other tools.
  it("does not let a single bad descriptor sink the good ones", () => {
    const { tools, rejected } = projectTools([
      { ...good, inputSchema: null as never },
      { ...good, name: "my_realtime" },
    ]);
    expect(tools.map((t) => t.name)).toEqual(["my_realtime"]);
    expect(rejected).toHaveLength(1);
  });

  it("handles an empty list", () => {
    expect(projectTools([])).toEqual({ tools: [], rejected: [] });
  });

  it("preserves order", () => {
    const { tools } = projectTools([
      { ...good, name: "my_realtime" },
      good,
      { ...good, name: "place_search" },
    ]);
    expect(tools.map((t) => t.name)).toEqual([
      "my_realtime",
      "keyword_trend",
      "place_search",
    ]);
  });
});
