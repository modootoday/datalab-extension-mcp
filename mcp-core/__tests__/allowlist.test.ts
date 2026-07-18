import { describe, expect, it } from "vitest";

import {
  EXCLUDED_TOOLS,
  READ_ONLY_TOOLS,
  filterAllowed,
  isAllowedTool,
} from "../src/allowlist.js";
import { MCP_TOOL_NAME_RE } from "../src/protocol.js";

describe("READ_ONLY_TOOLS", () => {
  it("has no duplicates", () => {
    expect(new Set(READ_ONLY_TOOLS).size).toBe(READ_ONLY_TOOLS.length);
  });

  // A name the host cannot address is worse than a missing tool: it fails at
  // the provider, far from here.
  it("every name is a legal MCP tool name", () => {
    const bad = READ_ONLY_TOOLS.filter((n) => !MCP_TOOL_NAME_RE.test(n));
    expect(bad).toEqual([]);
  });

  // The two lists are the two halves of one audit. An overlap means a merge
  // accident silently widened the surface — the exact failure this guards.
  it("never overlaps EXCLUDED_TOOLS", () => {
    const overlap = READ_ONLY_TOOLS.filter((n) => n in EXCLUDED_TOOLS);
    expect(overlap).toEqual([]);
  });

  it("excludes every tool that writes to a post", () => {
    for (const name of [
      "editor_replace",
      "editor_set_title",
      "editor_insert_draft",
      "editor_insert_image",
      "editor_undo",
      "generate_images",
    ]) {
      expect(isAllowedTool(name), `${name} must never be exposed`).toBe(false);
      expect(EXCLUDED_TOOLS[name]).toBeTruthy();
    }
  });

  it("excludes every tool that spends the user's AI credits", () => {
    for (const name of [
      "write_draft",
      "internal_links",
      "outline_suggest",
      "seo_aeo_geo_spec",
      "title_optimize",
      "benchmark_gap",
      "content_calendar",
    ]) {
      expect(isAllowedTool(name), `${name} would double-bill the user`).toBe(
        false,
      );
    }
  });

  // Regression guard for two specific traps found while deriving this list.
  it("keeps the deterministic scorecard while dropping its model-calling siblings", () => {
    expect(isAllowedTool("seo_scorecard")).toBe(true);
    expect(isAllowedTool("outline_suggest")).toBe(false);
  });

  it("admits run_research despite its misleading category", () => {
    // Grouped with the writing tools, but calls no model — admitted on
    // behaviour. If someone re-derives this list from categories, this fails.
    expect(isAllowedTool("run_research")).toBe(true);
  });
});

describe("isAllowedTool", () => {
  it("admits a known-good tool", () => {
    expect(isAllowedTool("keyword_trend")).toBe(true);
  });

  // Default-deny: a tool added to the extension tomorrow is invisible until
  // reviewed, rather than exposed by accident.
  it("denies anything unknown", () => {
    expect(isAllowedTool("some_tool_added_next_week")).toBe(false);
    expect(isAllowedTool("")).toBe(false);
  });

  it("denies the obvious escape hatches an attacker would want", () => {
    for (const name of ["eval_js", "query_selector", "run", "exec", "fetch"]) {
      expect(isAllowedTool(name)).toBe(false);
    }
  });

  it("is exact, not prefix- or case-insensitive", () => {
    expect(isAllowedTool("keyword_trend_")).toBe(false);
    expect(isAllowedTool("KEYWORD_TREND")).toBe(false);
    expect(isAllowedTool(" keyword_trend")).toBe(false);
  });
});

describe("filterAllowed", () => {
  it("keeps allowed and drops denied", () => {
    const out = filterAllowed([
      { name: "keyword_trend" },
      { name: "editor_replace" },
      { name: "my_realtime" },
      { name: "eval_js" },
    ]);
    expect(out.map((t) => t.name)).toEqual(["keyword_trend", "my_realtime"]);
  });

  it("returns empty for an all-denied list", () => {
    expect(filterAllowed([{ name: "editor_undo" }])).toEqual([]);
  });

  it("preserves the original objects and order", () => {
    const a = { name: "keyword_trend", extra: 1 };
    const b = { name: "my_realtime", extra: 2 };
    expect(filterAllowed([a, b])).toEqual([a, b]);
  });
});

describe("EXCLUDED_TOOLS", () => {
  it("gives a reason for every exclusion", () => {
    for (const [name, reason] of Object.entries(EXCLUDED_TOOLS)) {
      expect(reason, `${name} needs a reason`).toBeTruthy();
      expect(typeof reason).toBe("string");
    }
  });

  // It is published as documentation; a frozen object cannot be edited at
  // runtime to make an exclusion disappear.
  it("is frozen", () => {
    expect(Object.isFrozen(EXCLUDED_TOOLS)).toBe(true);
  });
});
