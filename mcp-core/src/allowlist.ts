/**
 * The read-only tool allowlist — the closed enum this bridge exposes.
 *
 * This file IS the security boundary, and it is published so you can audit it:
 * these are the only tools an external MCP host can ever invoke through the
 * extension. Everything else is denied by default.
 *
 * Three constraints converge on read-only, which is why the list is explicit
 * rather than derived from a category:
 *
 *  1. **There is no way to ask you.** A tool call arriving from an external
 *     host has no UI attached to it. Any tool that would need your
 *     confirmation would either run without it or hang forever. Neither is
 *     acceptable, so those tools are not exposed at all.
 *  2. **Your AI credits must not be spent twice.** The host calling us already
 *     ran a model to decide on the call. A tool that then calls *your* own
 *     configured model would bill you a second time for the same turn.
 *  3. **Browser extensions may not be remote-controlled by arbitrary code.**
 *     A fixed, enumerated vocabulary whose logic ships inside the extension is
 *     permitted; an open-ended execution channel is not. A closed list is how
 *     this bridge stays on the right side of that line.
 *
 * This bridge reads. It does not publish, post, edit, or delete anything.
 *
 * 🔴 **Enforce this inside the extension, never in the server alone.** The
 * server is a separate local process that an attacker on your machine could
 * replace; the extension is the gate that actually holds. `isAllowedTool` is
 * exported for both, but the extension's check is the load-bearing one.
 *
 * 🔴 **Read-only is necessary but not sufficient for admission.** A candidate
 * must also need no confirmation and call no language model. Verify against the
 * real implementation before adding — a tool's category label is not a reliable
 * proxy for what it does (see `run_research` below).
 */

/**
 * Every tool the bridge may invoke. Verified against the live implementation,
 * not against documentation.
 */
export const READ_ONLY_TOOLS: readonly string[] = [
  // --- Search-ad estimates. Uses your own advertiser API credentials. ---
  "ad_average_position_bid",
  "ad_competition_density",
  "ad_estimate_bid",
  "ad_estimate_bulk",
  "ad_estimate_performance",
  "ad_keyword_stats",
  "ad_min_exposure_bid",
  "ad_performance_balance",

  // --- Aggregate comment analytics ---
  "comment_category_spread",
  "comment_country",
  "comment_device",
  "comment_genderage",
  "comment_hourly",
  "comment_trend",
  "comment_user_trend",

  // --- Public blog / cafe profiles ---
  "blog_categories",
  "blog_popular",
  "blog_posts",
  "blog_profile",
  "blog_search",
  "blog_today_visitor",
  "blog_visit_series",
  "cafe_menus",
  "cafe_popular",
  "cafe_profile",

  // --- Influencer profiles and rankings ---
  "influencer_categories",
  "influencer_category_keywords",
  "influencer_category_top",
  "influencer_challenges",
  "influencer_my_topics",
  "influencer_posts",
  "influencer_profile",
  "influencer_stats",

  // --- Keyword demand and trend data ---
  "autocomplete_keywords",
  "cafe_volume",
  "content_volume",
  "keyword_opportunity",
  "keyword_trend",
  "keyword_trend_batch",
  "keyword_trend_compare",
  "keyword_yoy",
  "kin_question_demand",
  "qra_keywords",
  "search_keywords",
  "web_read",

  // --- Regional demand ---
  "local_area_category_rank",
  "local_job_categories",
  "local_region_trend",
  "local_regions",

  // --- Your OWN channel analytics ---
  "daily_trend",
  "my_audience",
  "my_blog_summary",
  "my_channels",
  "my_content_audience",
  "my_content_detail",
  "my_content_inflow",
  "my_content_info",
  "my_content_read",
  "my_country",
  "my_daily_brief",
  "my_device",
  "my_dwell",
  "my_followers",
  "my_impression_click",
  "my_impression_ranks",
  "my_inflow",
  "my_inflow_domain",
  "my_moments",
  "my_publish_calendar",
  "my_realtime",
  "my_revenue",
  "my_revenue_efficiency",
  "my_revenue_ranks",
  "my_revisit",
  "my_soaring",
  "my_top_content",
  "my_traffic_series",

  // --- Public place data, and reads of a place you own ---
  "place_ai_briefing",
  "place_announcements",
  "place_autocomplete",
  "place_blog_reviews",
  "place_booking",
  "place_coupons",
  "place_info",
  "place_keyword_precheck",
  "place_live_commerce",
  "place_nearby",
  "place_owner_review_stats",
  "place_owner_reviews_sentiment",
  "place_pet_nearby",
  "place_photos",
  "place_promotions",
  "place_realtime_wait",
  "place_reply_queue",
  "place_review_stats",
  "place_reviews",
  "place_search",
  "place_shop_window",

  // --- Search-result reads ---
  "blog_rank_profile",
  "cafe_community_profile",
  "search_ad",
  "search_blog",
  "search_cafe",
  "search_image",
  "search_influencer",
  "search_kin",
  "search_news",
  // `search_total` is referenced by search_blog's description — leaving it out
  // made that reference a broken link for MCP hosts (2026-07-17 audit).
  "search_total",
  "search_video",
  "search_web",
  "serp_my_rank_check",
  "serp_pattern_analyze",

  // --- Category and keyword commerce data ---
  "shopping_categories",
  "shopping_category_age",
  "shopping_category_click",
  "shopping_category_device",
  "shopping_category_gender",
  "shopping_category_keywords",
  "shopping_category_rank",
  "shopping_keyword_age",
  "shopping_keyword_click",
  "shopping_keyword_device",
  "shopping_keyword_gender",
  "shopping_keyword_risers",
  "shopping_season_onset",

  // --- The deterministic SEO scorecard only. ---
  // Its siblings that suggest titles, outlines, or specs all call a language
  // model, and are excluded for that reason.
  "seo_scorecard",

  // --- Grouped with the writing tools, but a pure collector. ---
  // `run_research` is categorised alongside tools that call a model, yet calls
  // none itself — it only gathers public data. Its label is misleading; it was
  // admitted after checking what it actually does. Classify by behaviour, not
  // by category.
  "run_research",
];

/** O(1) membership. Frozen so a caller cannot widen the surface at runtime. */
const ALLOWED = Object.freeze(new Set(READ_ONLY_TOOLS));

/**
 * Excluded tools and why — published as the other half of the audit. If you
 * wonder why some capability is missing, it is here with a reason.
 *
 * Kept as data rather than prose so a test can assert the two sets never
 * overlap: a name in both would silently widen the surface.
 */
export const EXCLUDED_TOOLS: Readonly<Record<string, string>> = Object.freeze({
  // Writes into the post you are editing. This bridge does not type for you.
  editor_insert_draft: "writes to your post; needs your confirmation",
  editor_insert_image: "writes to your post; needs your confirmation",
  editor_replace: "writes to your post; needs your confirmation",
  editor_set_title: "writes to your post; needs your confirmation",
  // 🔴 Carries no confirmation prompt, yet still mutates — which is precisely
  // why admission is decided per tool by behaviour, and never by filtering on
  // "does it have a confirmation flag".
  editor_undo:
    "mutates your post (no confirmation prompt — judged by behaviour)",
  generate_images:
    "writes to your post, needs confirmation, and spends your AI credits",

  // Deferred rather than rejected: genuinely read-only, but each needs a post
  // open in a tab, and an external agent has no tab to open. Revisit if a
  // caller ever has a reason to ask.
  editor_read: "deferred — needs an editor tab open",
  editor_read_structure: "deferred — deferred alongside editor_read",

  // Spend your own AI credits on a turn the calling host already paid for.
  write_draft: "calls your language model (you would be billed twice)",
  internal_links: "calls your language model (you would be billed twice)",
  outline_suggest: "calls your language model (you would be billed twice)",
  seo_aeo_geo_spec: "calls your language model (you would be billed twice)",
  title_optimize: "calls your language model, and needs your confirmation",
  benchmark_gap: "calls your language model (you would be billed twice)",
  content_calendar: "calls your language model (you would be billed twice)",

  // Side effect outside the request/response contract.
  export_report: "triggers a file download",
});

/**
 * The gate. Everything not explicitly listed is denied.
 *
 * Default-deny is the point: a tool added to the extension tomorrow stays
 * invisible to MCP until a human reviews it and adds it here.
 */
export function isAllowedTool(name: string): boolean {
  return ALLOWED.has(name);
}

/**
 * Drop anything not allowlisted.
 *
 * Applied to the descriptor list before a host ever sees it, so a denied tool
 * is never even named — a model cannot ask for what it cannot see, which is
 * stronger than refusing the call afterwards.
 */
export function filterAllowed<T extends { name: string }>(
  tools: readonly T[],
): T[] {
  return tools.filter((t) => ALLOWED.has(t.name));
}
