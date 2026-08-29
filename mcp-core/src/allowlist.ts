/**
 * The tool allowlist — the closed enum this bridge exposes, published so it can
 * be audited. The read-only half runs unasked; everything in the tier table
 * changes something or costs money and carries a tier deciding how the user is
 * asked. A name in neither is denied.
 *
 * The gate is the tier lookup, enforced inside the extension. The server
 * is a separate local process and cannot be the thing that holds.
 */

/**
 * The half that only reads.
 *
 * Admission is by behaviour, not by category label: verify against the real
 * implementation before adding. Anything that changes something belongs in
 * the tier table instead.
 */
export const READ_ONLY_TOOLS: readonly string[] = [
  "datalab_browsers",
  // --- Search-ad estimates. Uses the user's own advertiser API credentials. ---
  "ad_average_position_bid",
  "ad_competition_density",
  "ad_estimate_bid",
  "ad_estimate_bulk",
  "ad_estimate_performance",
  "ad_keyword_stats",
  "ad_min_exposure_bid",
  "ad_performance_balance",
  // These three read the advertiser's own account rather than pricing a
  // hypothetical bid — balance, spend, and per-campaign/keyword delivery.
  // Read-only by
  // construction: the client exposes no charge, refund or campaign-write path,
  // and asks for no gender/age breakdown even though /api/stats offers one.
  "ad_bizmoney",
  "ad_campaign_stats",
  "ad_keyword_spend",

  // --- The seller's own SmartStore money, via the official Commerce API and
  // the user's own application pair. Read-only by construction: the service
  // exposes settlement and sales reads and nothing else, and  it drops the
  // payout account (accountNo / depositorName / bankType) that the settlement
  // response carries, so no host ever receives it. ---
  "commerce_settlement",
  "commerce_sales",
  // Counts only — the order feed's ids stop at the service boundary.
  "commerce_orders",
  "commerce_product_issues",

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

  // --- The user's own channel analytics ---
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

  // --- Public place data, and reads of a place the user owns ---
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
  // Referenced by search_blog's description, so omitting it would leave a
  // dangling reference for hosts.
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

  // --- Planning tools that need a model, but never call one from here ---
  // The calling host already ran its own model, so calling the user's too
  // would bill one turn twice. These return prompt material and make no model
  // call, which is what lets them read and suggest here, undoing nothing.
  "outline_suggest",
  "seo_aeo_geo_spec",
  // Two-stage (analyse, then draft), so it returns the first stage's prompt and
  // the second only once the host hands the result back. The
  // style profile travels as prose inside that prompt, not as an object.
  "write_draft",
  "benchmark_gap",
  "content_calendar",
  "internal_links",
  // Hands back the procedure for one step of a full write, shaped by what the
  // caller measured in the step before. Reads nothing and calls no model.
  "write_pipeline_step",
  // Writes the title in the panel, where a pick IS the confirmation — but the
  // pick lives in the consent step, and MCP never reaches it: only a
  // needs-confirm result continues there, and this one returns prompt material.
  "title_optimize",

  // --- Grouped with the writing tools, but a pure collector. ---
  // Calls no model itself — it only gathers public data. Admitted after
  // checking behaviour rather than trusting the category label.
  "run_research",
];

/** O(1) membership. Frozen so a caller cannot widen the surface at runtime. */
const ALLOWED = Object.freeze(new Set(READ_ONLY_TOOLS));

/**
 * Excluded tools and why — the other half of the audit surface.
 *
 * Documentation, not a gate: exposure is decided by the read-only list and
 * the tier table alone. Kept as data so a test can assert this table never
 * overlaps either of those, since a name in both would widen the surface.
 */
export const EXCLUDED_TOOLS: Readonly<Record<string, string>> = Object.freeze({
  generate_images:
    "writes to your post, needs confirmation, and spends your AI credits",

  // Side effect outside the request/response contract.
  export_report: "triggers a file download",

  // A host that can generate its own image has a free way onto the canvas —
  // gallery_image_add. Spending credits for what the caller already has is the
  // charge nobody meant to make.
  photo_ai_image_add:
    "spends your AI credits for an image your own app can make and hand over",
  video_image_realign:
    "spends your AI credits per photo to reach what the free scene tools already reach",
});

/**
 * Membership in the read-only half.
 *
 * NOT the exposure gate — this is false for every tiered tool even though a
 * host can see and call those. Ask the tier lookup about visibility.
 */
export function isReadOnlyTool(name: string): boolean {
  return ALLOWED.has(name);
}

/**
 * Tool tiers — the enum stays closed. Read runs unasked; write, destructive
 * and paid are confirmed per call, and the tier decides what that confirm
 * states and what a host is told, not whether one appears.
 *
 * There is no standing consent. A confirm is answered by the user, or by a
 * server-issued grant that never answers paid. A name in neither this table
 * nor the read-only list is refused.
 */
export type ToolTier =
  | "read"
  | "write"
  | "destructive"
  | "paid"
  // Deliberately unassigned: the risk lives on a third-party surface we cannot
  // verify, so no user consent can open it. Emptiness is pinned by test — a
  // tool given this tier vanishes from the catalog with nothing failing.
  | "naver-write";

/**
 * Tiered tools — everything outside the read-only list.
 *
 * This is the full set of tools that can change anything the user owns.
 * They write only after the panel has asked, and never to publish.
 */
export const TOOL_TIERS: Readonly<Record<string, ToolTier>> = Object.freeze({
  // ── Photo editor (our own surface) ──────────────────────────────
  photo_project_get: "read",
  photo_project_new: "destructive",
  photo_project_list: "read",
  photo_project_open: "destructive",
  photo_project_rename: "write",
  photo_canvas_get: "read",
  photo_gallery_list: "read",
  photo_text_add: "write",
  photo_shape_add: "write",
  photo_sticker_add: "write",
  photo_frame_add: "write",
  photo_image_add_from_gallery: "write",
  photo_page_add: "write",
  photo_node_update: "write",
  photo_node_arrange: "write",
  photo_background_set: "write",
  photo_canvas_resize: "write",
  photo_page_reorder: "write",
  photo_node_remove: "destructive",
  photo_page_remove: "destructive",
  photo_template_apply: "destructive",

  // ── Gallery: the free way in ────────────────────────────────────
  //
  // Destructive because it reads a path off the user's disk, the same
  // capability editor_insert_image carries, and the confirm names that read.
  gallery_image_add: "destructive",

  // ── Video editor (our own surface) ──────────────────────────────
  video_project_get: "read",
  video_project_new: "destructive",
  video_project_list: "read",
  video_project_open: "destructive",
  video_project_rename: "write",
  video_timeline_get: "read",
  video_sources_list: "read",
  video_scene_add: "write",
  video_subtitle_set: "write",
  video_scene_image_set: "write",
  // Brings a gallery picture into this video — an add, like video_image_add.
  // The disk read already happened at gallery_image_add, under its own confirm.
  video_image_add_from_gallery: "write",
  video_scene_update: "write",
  video_background_set: "write",
  // destructive, unlike the photo editor's same-named tool. There it
  // retargets the page you are looking at; here the encoder reads one size off
  // the first scene and renders the whole video at it, so one wrong value
  // reflows every scene. Bulk is what makes it destructive, and no tool here
  // can undo it — the agent has no undo to call.
  video_canvas_resize: "destructive",
  video_scene_reorder: "write",
  video_text_add: "write",
  video_image_add: "write",
  video_node_update: "write",
  video_node_arrange: "write",
  video_node_remove: "destructive",
  video_scene_remove: "destructive",
  video_narration_generate: "paid",

  // ── Post editor: reads ──────────────────────────────────────────
  editor_read: "read",
  editor_read_structure: "read",

  // ── Post editor: writes ─────────────────────────────────────────
  //
  // Every injection is bracketed by a vendor autosave, plus a separate copy
  // of the document for the cases the vendor refuses one. Without that
  // recovery point, editor undo would be the only way back.
  //
  // Only whole-body replacement is destructive: the others append, so the
  // autosave point still holds, while replacing the body overwrites it.
  editor_insert_draft: "write",
  // `write`, and it stays that way because it REFUSES an occupied body rather
  // than overwriting it. A replace fallback would make it destructive while its
  // confirm still reads as an append, so that fallback is a review-block.
  editor_place_draft: "write",
  // Opening a window edits no document, but it does create a tab in the user's
  // browser — one tier keeps it one thing for the user to allow.
  editor_open_window: "write",
  // Closing a window cannot be undone and the user's draft may be inside, so
  // the confirm names the loss rather than the tab.
  editor_reduce_windows: "destructive",

  // ── Pumasi: a page the member does not own ──────────────────────
  //
  // Reading and opening only. None of the three leaves a mark on the post, and
  // still none of them is `read`: that grade runs unasked, and what these open
  // is somebody else's blog. ADR-PUMASI-001 admits the surface on the condition
  // that every call is asked about, so `write` is the floor here rather than a
  // description of how much they change.
  pumasi_like_state: "write",
  pumasi_neighbor_state: "write",
  pumasi_comment_open: "write",
  pumasi_neighbor_open: "write",
  // Discovery. Same grade for a different reason: these two change nothing at
  // all and are still the only calls that hand back OTHER people's identifiers,
  // up to twenty at a time, into whichever model host is asking. The per-call
  // question is what the member gets in exchange for that, so it is the floor.
  pumasi_reactors: "write",
  pumasi_commenters: "write",
  // The first one that leaves the member's words on a stranger's page. Its
  // confirm card is derived from the submit argument, not from this grade.
  pumasi_comment_draft: "destructive",
  // Same grade for the same reason. What it fills is a request addressed to a
  // person, and the group it would go to is chosen by Naver when nobody says.
  pumasi_neighbor_draft: "destructive",
  // A wrong target withdraws a request the member intended to keep.
  pumasi_neighbor_cancel: "destructive",
  // The member's own browser. Listing it is not `read`: that grade runs
  // unasked, and what comes back is where the member has been. Focusing moves
  // what they are looking at, and closing can take an unsaved draft with it -
  // the same reason editor_reduce_windows carries the grade it does.
  tab_list: "write",
  tab_open: "write",
  tab_focus: "write",
  tab_close: "destructive",
  // Insertion appends, so it never passes through the overwrite prompt; the
  // tier is the only barrier, and the user approves each image's source.
  editor_insert_image: "destructive",
  // destructive, and one confirm covers the whole plan on purpose. What the
  // user approves is "make the post look like this", not each keystroke inside
  // it — and asking per step would defeat the unattended sequence this exists
  // for. Reach is the five document-assembly steps; the runner refuses anything
  // else.
  editor_apply_manifest: "destructive",
  editor_set_title: "write",
  editor_undo: "write",
  editor_replace: "destructive",
});

/** How a tier is asked about. */
export type TierPolicy = "always" | "per-call" | "closed";

export function tierPolicy(tier: ToolTier): TierPolicy {
  switch (tier) {
    case "read":
      return "always";
    case "write":
    case "destructive":
    case "paid":
      return "per-call";
    default:
      return "closed";
  }
}

/**
 * What a paid tool charges for, and who states the exact amount.
 *
 * A confirmation must be pressed knowing the price. Some paid tools can
 * only be priced against the document, so the editor counts and asks again;
 * others are a fixed unit the panel prices itself, and for those this prompt
 * is the only gate. The flag keeps the panel from promising a second one.
 */
export interface PaidToolCost {
  /** What the charge is for, in one line. */
  readonly basis: string;
  /** Does the editor ask again with the exact amount once allowed? */
  readonly editorAsksAgain: boolean;
}

export const PAID_TOOL_COSTS: Readonly<Record<string, PaidToolCost>> =
  Object.freeze({
    video_narration_generate: Object.freeze({
      basis: "목소리가 없는 장면 수만큼 음성 생성",
      editorAsksAgain: true,
    }),
  });

export function paidToolCost(name: string): PaidToolCost | null {
  return Object.hasOwn(PAID_TOOL_COSTS, name) ? PAID_TOOL_COSTS[name]! : null;
}

/**
 * This tool's tier: read when it is in the read-only list, its own tier when
 * it is in the table, otherwise null.  An unknown name is refused.
 */
export function tierOf(name: string): ToolTier | null {
  if (ALLOWED.has(name)) return "read";
  return Object.hasOwn(TOOL_TIERS, name) ? TOOL_TIERS[name]! : null;
}

/**
 * Drop anything not allowlisted from a descriptor list.
 *
 * The property this states — a model cannot ask for what it was never shown,
 * which is stronger than refusing the call afterwards — is enforced by the
 * panel's catalog builder, not here. This helper has no production caller; read
 * the guarantee where it is applied rather than assuming this line applies it.
 */
export function filterReadOnly<T extends { name: string }>(
  tools: readonly T[],
): T[] {
  return tools.filter((t) => ALLOWED.has(t.name));
}
