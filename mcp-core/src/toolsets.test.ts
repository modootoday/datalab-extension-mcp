/**
 * A group must never lose a tool. With the catalog served as an answer
 * rather than as definitions, this table is the only discovery path: a tool in
 * no group does not exist for the model, and nothing fails to report it
 * because nobody can call it in the first place.
 */
import { describe, expect, it } from "vitest";
import { buildToolsets, toolsetOf } from "./toolsets.js";

describe("buildToolsets", () => {
  it("넘긴 이름을 하나도 잃지 않는다", () => {
    const names = [
      "my_daily_brief",
      "my_inflow",
      "keyword_trend",
      "search_serp",
      "blog_rank",
      "place_reviews",
      "shopping_trend",
      "ad_bid",
      "comment_stats",
      "photo_add_text",
      "video_add_scene",
      "editor_read",
      "run_research",
      "local_regions",
    ];
    const seen = buildToolsets(names).flatMap((s) => s.tools);
    expect([...seen].sort()).toEqual([...names].sort());
  });

  it("아무 묶음에도 안 걸린 이름은 사라지지 않고 나머지 묶음으로 간다", () => {
    const sets = buildToolsets(["totally_new_shape"]);
    const other = sets.find((s) => s.slug === "other");
    expect(other?.tools).toEqual(["totally_new_shape"]);
  });

  it("빈 묶음은 답변에 싣지 않는다", () => {
    const sets = buildToolsets(["my_daily_brief"]);
    expect(sets.map((s) => s.slug)).toEqual(["blog-brief"]);
  });

  it("같은 이름을 두 묶음에 넣지 않는다", () => {
    const sets = buildToolsets(["my_inflow", "my_daily_brief"]);
    const all = sets.flatMap((s) => s.tools);
    expect(new Set(all).size).toBe(all.length);
  });

  it("탭이 필요한 묶음을 표시한다", () => {
    const sets = buildToolsets(["editor_read", "photo_add_text", "keyword_x"]);
    expect(sets.find((s) => s.slug === "editor-control")?.needsTab).toBe(true);
    expect(sets.find((s) => s.slug === "photo-editor")?.needsTab).toBe(true);
    expect(sets.find((s) => s.slug === "keyword-research")?.needsTab).toBe(
      undefined,
    );
  });

  it("모든 묶음이 고를 수 있을 만큼의 설명을 갖는다", () => {
    for (const s of buildToolsets(["my_daily_brief", "keyword_trend"])) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.summary.length).toBeGreaterThan(0);
    }
  });
});

describe("toolsetOf", () => {
  it("이름 접두로 잡는다 — 새 도구가 자동으로 제자리에 들어간다", () => {
    expect(toolsetOf("keyword_brand_new_thing")).toBe("keyword-research");
    expect(toolsetOf("place_brand_new_thing")).toBe("place");
  });

  it("명시 목록이 접두보다 앞선다", () => {
    expect(toolsetOf("my_daily_brief")).toBe("blog-brief");
    expect(toolsetOf("my_inflow")).toBe("blog-insights");
  });

  it("탭이 필요 없는 조사 도구는 편집기 묶음에 넣지 않는다", () => {
    expect(toolsetOf("run_research")).toBe("keyword-research");
    expect(toolsetOf("editor_read")).toBe("editor-control");
  });

  it("모르는 이름은 null", () => {
    expect(toolsetOf("totally_new_shape")).toBeNull();
  });
});
