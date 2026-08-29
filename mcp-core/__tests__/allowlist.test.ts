import { describe, expect, it } from "vitest";

import {
  EXCLUDED_TOOLS,
  READ_ONLY_TOOLS,
  filterReadOnly,
  isReadOnlyTool,
  TOOL_TIERS,
  tierOf,
  tierPolicy,
  type ToolTier,
} from "../src/allowlist.js";
import { MCP_TOOL_NAME_RE } from "../src/protocol.js";

describe("READ_ONLY_TOOLS", () => {
  it("has no duplicates", () => {
    expect(new Set(READ_ONLY_TOOLS).size).toBe(READ_ONLY_TOOLS.length);
  });

  it("every name is a legal MCP tool name", () => {
    const bad = READ_ONLY_TOOLS.filter((n) => !MCP_TOOL_NAME_RE.test(n));
    expect(bad).toEqual([]);
  });

  it("never overlaps EXCLUDED_TOOLS", () => {
    const overlap = READ_ONLY_TOOLS.filter((n) => n in EXCLUDED_TOOLS);
    expect(overlap).toEqual([]);
  });

  // Either exposure path makes an "excluded" claim false, and the code stays
  // correct while the audit document lies.
  it("EXCLUDED_TOOLS 가 등급표와도 겹치지 않는다", () => {
    const exposed = Object.keys(EXCLUDED_TOOLS).filter(
      (n) => tierOf(n) !== null,
    );
    expect(
      exposed,
      "이 도구들은 등급이 있어 실제로 노출된다. 노출이 의도라면 제외 목록에서 빼고, 아니라면 등급을 빼라.",
    ).toEqual([]);
  });

  // The invariant is not exclusion but cost: a post-writing tool may be
  // exposed, and never without consent.
  it("never opens a post-writing tool for free", () => {
    for (const name of [
      "editor_replace",
      "editor_set_title",
      "editor_insert_draft",
      "editor_insert_image",
      "editor_undo",
    ]) {
      expect(isReadOnlyTool(name), `${name} must never be read-only`).toBe(
        false,
      );
      const tier = tierOf(name);
      expect(tier, `${name} must be classified`).not.toBeNull();
      // The always policy runs without asking, which no post-writing tool may.
      expect(tierPolicy(tier!), `${name} must cost consent`).not.toBe("always");
    }
  });

  it("still excludes the post-writing tool that spends AI credits", () => {
    expect(isReadOnlyTool("generate_images")).toBe(false);
    expect(EXCLUDED_TOOLS["generate_images"]).toBeTruthy();
    expect(tierOf("generate_images")).toBeNull();
  });

  /**
   * The rule is not "exclude tools that need a model" but "exclude tools
   * that spend the user's credits". These return prompt material on the MCP
   * path and make no model call. That they truly make none cannot be proven
   * here, since this package never sees a tool implementation.
   */
  it("admits model-needing tools that spend NOTHING on the MCP path", () => {
    for (const name of [
      "internal_links",
      "outline_suggest",
      "seo_aeo_geo_spec",
      "benchmark_gap",
      "content_calendar",
    ]) {
      expect(
        isReadOnlyTool(name),
        `${name} returns material, not a model call`,
      ).toBe(true);
    }
  });

  /**
   * A two-stage pipeline, so it returns the first stage's prompt and the
   * second only once the host hands the result back.  The style profile
   * travels as prose inside that prompt, which carries strictly less than the
   * profile object would.
   */
  it("admits write_draft — its material is a prompt, not the profile object", () => {
    expect(isReadOnlyTool("write_draft")).toBe(true);
  });

  // It produces image bytes, which no MCP frame can carry back, so handing it
  // material would leave the result unreachable.
  it("still excludes generate_images — bytes cannot come back", () => {
    expect(isReadOnlyTool("generate_images")).toBe(false);
  });

  // A pick IS the confirmation in the panel, but that pick lives in the consent
  // step and MCP never reaches it: only a needs-confirm result continues there,
  // and this tool hands back prompt material instead.
  it("admits title_optimize — over MCP it changes nothing", () => {
    expect(isReadOnlyTool("title_optimize")).toBe(true);
    expect(TOOL_TIERS["title_optimize"]).toBeUndefined();
  });

  // A newer extension can name a tier this build has never heard of. Falling
  // closed is what keeps a pinned old server from guessing generously.
  it("an unknown tier falls closed rather than open", () => {
    expect(tierPolicy("mystery" as ToolTier)).toBe("closed");
  });

  it("keeps the deterministic scorecard", () => {
    expect(isReadOnlyTool("seo_scorecard")).toBe(true);
  });

  it("admits run_research despite its misleading category", () => {
    // Fails if anyone re-derives this list from category labels.
    expect(isReadOnlyTool("run_research")).toBe(true);
  });
});

describe("isReadOnlyTool", () => {
  it("admits a known-good tool", () => {
    expect(isReadOnlyTool("keyword_trend")).toBe(true);
  });

  it("denies anything unknown", () => {
    expect(isReadOnlyTool("some_tool_added_next_week")).toBe(false);
    expect(isReadOnlyTool("")).toBe(false);
  });

  it("denies the obvious escape hatches an attacker would want", () => {
    for (const name of ["eval_js", "query_selector", "run", "exec", "fetch"]) {
      expect(isReadOnlyTool(name)).toBe(false);
    }
  });

  it("is exact, not prefix- or case-insensitive", () => {
    expect(isReadOnlyTool("keyword_trend_")).toBe(false);
    expect(isReadOnlyTool("KEYWORD_TREND")).toBe(false);
    expect(isReadOnlyTool(" keyword_trend")).toBe(false);
  });
});

describe("filterReadOnly", () => {
  it("keeps allowed and drops denied", () => {
    const out = filterReadOnly([
      { name: "keyword_trend" },
      { name: "editor_replace" },
      { name: "my_realtime" },
      { name: "eval_js" },
    ]);
    expect(out.map((t) => t.name)).toEqual(["keyword_trend", "my_realtime"]);
  });

  it("returns empty for an all-denied list", () => {
    expect(filterReadOnly([{ name: "editor_undo" }])).toEqual([]);
  });

  it("preserves the original objects and order", () => {
    const a = { name: "keyword_trend", extra: 1 };
    const b = { name: "my_realtime", extra: 2 };
    expect(filterReadOnly([a, b])).toEqual([a, b]);
  });
});

describe("EXCLUDED_TOOLS", () => {
  it("gives a reason for every exclusion", () => {
    for (const [name, reason] of Object.entries(EXCLUDED_TOOLS)) {
      expect(reason, `${name} needs a reason`).toBeTruthy();
      expect(typeof reason).toBe("string");
    }
  });

  it("is frozen", () => {
    expect(Object.isFrozen(EXCLUDED_TOOLS)).toBe(true);
  });
});

/**
 * The tier exists in the type and is given to nothing. Without this pair,
 * "deliberately empty" and "someone forgot" are the same state — and a tool
 * that gets this tier disappears from the catalog with nothing failing.
 */
describe("naver-write", () => {
  // ADR-PUMASI-001 admitted tools that reach a page the member does not own.
  // This tier is not what admits them: it stays empty and closed, and those
  // tools carry an ordinary tier and are asked about on every call.
  it("열거형에는 남아 있고 정책은 closed 다", () => {
    expect(tierPolicy("naver-write")).toBe("closed");
  });

  it("아무 도구에도 부여되지 않았다", () => {
    const assigned = Object.entries(TOOL_TIERS)
      .filter(([, tier]) => tier === "naver-write")
      .map(([name]) => name);
    expect(
      assigned,
      "의도라면 이 테스트를 함께 고쳐라 — 부여하는 순간 그 도구는 어떤 실패도 없이 MCP 에서 사라진다",
    ).toEqual([]);
  });
});

/**
 * Tools that reach a page the member does not own: an ordinary tier, a question
 * on every call, never the read grade, and borrowed tools left in the domains
 * that own them.
 *
 * The set is drawn from BOTH lists tierOf consults. Reading only the tier table
 * would leave the read grade - the one grade that runs unasked, and the one
 * these assertions forbid - conferred by a list the assertions never open.
 *
 * The census pins how many exist, so the set these run over can never grow
 * without somebody coming back to read them.
 */
describe("제3자 표면 도구", () => {
  const thirdParty = [
    ...new Set([...Object.keys(TOOL_TIERS), ...READ_ONLY_TOOLS]),
  ]
    .filter((name) => name.startsWith("pumasi_"))
    .sort();

  it("인구조사 — 이 목록이 자라면 아래 셋을 다시 읽어라", () => {
    // Draft tools can publish when requested; cancel withdraws a pending request.
    //
    // The 20260827 pair is a different KIND and the census exists to make
    // somebody say so: every other name here acts on ONE stranger the member
    // named, while these two bring back up to twenty strangers the member did
    // not. Nothing about them is written down, and the tools cap and report
    // rather than truncate - but the direction is new, and it is what the
    // "가장 방어가 얇은 지점" in the ADR is about.
    expect(thirdParty).toEqual([
      "pumasi_comment_draft",
      "pumasi_comment_open",
      "pumasi_commenters",
      "pumasi_like_state",
      "pumasi_neighbor_cancel",
      "pumasi_neighbor_draft",
      "pumasi_neighbor_open",
      "pumasi_neighbor_state",
      "pumasi_reactors",
    ]);
  });

  it("② closed 가 아니고 전부 호출마다 묻는다", () => {
    const wrong = thirdParty.filter((name) => {
      const policy = tierPolicy(tierOf(name) as ToolTier);
      return policy !== "per-call";
    });
    expect(wrong, "제3자 표면을 확인 없이 여는 도구").toEqual([]);
  });

  it("③ read 등급이 0개다", () => {
    // read is the one grade that runs unasked, so it is the grade these tools
    // never carry.
    const reads = thirdParty.filter((name) => tierOf(name) === "read");
    expect(reads).toEqual([]);
  });

  it("④-c 빌려 쓰는 도구는 등급을 올리지 않는다", () => {
    // The move that would break this is not a rename under a pumasi prefix: it
    // is one of these leaving the read-only list under its own name to be given
    // a tier. That gates nothing - the same data still comes out of the domain
    // that owns them - and costs a confirm on every borrowed read.
    const borrowed = ["blog_posts", "search_blog", "web_read"];
    const moved = borrowed.filter((name) => tierOf(name) !== "read");
    expect(moved, "차용 도구가 read 를 잃었다").toEqual([]);
  });
});

/**
 * tierOf reads the read-only list first and that answer wins, so a name in both
 * places silently resolves to read whatever tier the table gives it. Nothing
 * else in this package compares the two.
 */
describe("READ_ONLY_TOOLS 와 TOOL_TIERS", () => {
  it("겹치지 않는다 — 겹치면 표의 등급이 조용히 무시된다", () => {
    const both = READ_ONLY_TOOLS.filter((name) =>
      Object.hasOwn(TOOL_TIERS, name),
    );
    expect(both).toEqual([]);
  });
});
