/**
 * Groups tools by the job a person is trying to do.
 *
 * Exists so the catalog can be handed over as a tool RESULT rather than as
 * tool definitions. Exporting all of it as definitions hits per-host limits —
 * some hosts refuse the connection outright — and otherwise spends context
 * every turn. A few tools stay exposed; the rest are answered on ask.
 *
 * The grouping axis is the user's job, not the code's domain.
 */

export interface Toolset {
  /** Stable identifier used in settings and arguments. */
  readonly slug: string;
  /** Name carried in the catalog answer. */
  readonly label: string;
  /** One line on what this group does. */
  readonly summary: string;
  /** User phrases that select this group without knowing its product name. */
  readonly aliases: readonly string[];
  /** The broadest data boundary represented by this group. */
  readonly dataScope: "public" | "own" | "local" | "mixed";
  /**
   * Does this group need an open tab?
   *
   * Editor tools all fail without their editor tab. A model that does not
   * know this reads the failure as a broken tool and tries another one, when
   * the right move is to ask the user to open the tab.
   */
  readonly needsTab?: boolean;
  /**
   * Name of the tool that can open the tab itself. Without it a model can only
   * ask the user, so a capability that exists reads as one that does not.
   */
  readonly openerTool?: string;
  /**
   * Name of the tool that reduces several windows to one.
   *
   * The extension only drives a single window, so "several" blocks every
   * edit rather than merely warning. A call from outside dead-ends unless the
   * way out is named alongside the condition.
   */
  readonly reducerTool?: string;
  /**
   * The order these tools are meant to be used in.
   *
   * This is what our orchestrator actually knows that a host does not. The
   * host already has a model; what it lacks is which call comes first and which
   * one is the terminal act. Carried as a RESULT, so it costs no tool
   * definitions and no per-turn context (ADR-6 layer 1).
   *
   * Only where order genuinely changes the outcome. A group whose tools are
   * independent must not get invented steps — a false procedure is worse than
   * none, because it is followed.
   */
  readonly steps?: readonly string[];
  readonly tools: readonly string[];
}

/** "How is my blog doing today" — the daily glance. */
const BLOG_BRIEF = [
  "my_daily_brief",
  "my_blog_summary",
  "my_realtime",
  "my_traffic_series",
  "my_top_content",
  "my_soaring",
  "my_publish_calendar",
  "daily_trend",
  "my_moments",
] as const;

/** "Why is it doing that" — only when digging in. */
const BLOG_INSIGHTS = [
  "my_content_audience",
  "my_inflow",
  "my_audience",
  "my_inflow_domain",
  "my_country",
  "my_device",
  "my_dwell",
  "my_followers",
  "my_revisit",
  "my_revenue",
  "my_impression_click",
  "my_impression_ranks",
  "my_channels",
  "my_revenue_ranks",
  "my_revenue_efficiency",
  "my_content_info",
  "my_content_read",
  "my_content_detail",
  "my_content_inflow",
] as const;

/**
 * The remaining topic-research tools. Their name prefixes differ, so no prefix
 * rule collects them, but the user's job is one thing: decide what to write.
 */
const RESEARCH = [
  // Caught by serp-watch's "search_" prefix, but this group's own steps open
  // by calling it. A step naming a tool the group does not contain sends the
  // caller to a catalog page it is not on.
  "search_keywords",
  "local_regions",
  "local_job_categories",
  "local_region_trend",
  "local_area_category_rank",
  "content_volume",
  "autocomplete_keywords",
  "qra_keywords",
  "kin_question_demand",
  "web_read",
  "run_research",
  // Planning tools: they need a model but call none here, returning prompt
  // material instead. Grouped by job — all three design a post not yet written.
  "outline_suggest",
  "seo_aeo_geo_spec",
  "content_calendar",
  // The last step of that job: turn the design into an actual draft.
  "write_draft",
  // Names which of the above comes next given what the caller just measured —
  // the part of the job that cannot be written down ahead of time.
  "write_pipeline_step",
] as const;

/**
 * Editor control — read and edit the open draft.
 *
 * The public-research collector is deliberately absent: it needs no tab, and
 * including it would make this group's tab requirement a false claim.
 */
const EDITOR_CONTROL = [
  // The tool that opens a tab belongs in the group that requires one: a
  // model choosing this group was just told it needs a tab, and the way out
  // has to be visible at the wall, not in some other group.
  "editor_open_window",
  "editor_reduce_windows",
  "editor_read",
  "editor_read_structure",
  "editor_undo",
  "editor_replace",
  "editor_insert_draft",
  // Lands a draft from any window state without ever overwriting — refuses and
  // names the tool to use instead when the body is occupied.
  "editor_place_draft",
  "editor_set_title",
  // The whole plan in one call, for a run nobody is watching. Same group as the
  // steps it contains — a model that reached for those should see this too.
  "editor_apply_manifest",
  // Both act on the open draft: title_optimize proposes titles for it, and
  // internal_links reads it.
  "title_optimize",
  "internal_links",
  "editor_insert_image",
  "seo_scorecard",
] as const;

/**
 * Groups collected by name prefix, so no list is duplicated by hand.
 *
 * A duplicated list would go stale on one side when a tool is added, and
 * that tool would then belong to no group and vanish from the catalog.
 */
const BY_PREFIX: ReadonlyArray<{ slug: string; prefixes: readonly string[] }> =
  [
    { slug: "serp-watch", prefixes: ["search_", "serp_"] },
    { slug: "benchmark", prefixes: ["blog_", "cafe_", "influencer_"] },
    { slug: "place", prefixes: ["place_"] },
    { slug: "shopping", prefixes: ["shopping_"] },
    { slug: "ad-bidding", prefixes: ["ad_"] },
    { slug: "store-settlement", prefixes: ["commerce_"] },
    { slug: "comment-stats", prefixes: ["comment_"] },
    { slug: "photo-editor", prefixes: ["photo_"] },
    { slug: "video-editor", prefixes: ["video_"] },
    { slug: "keyword-research", prefixes: ["keyword_"] },
    { slug: "pumasi", prefixes: ["pumasi_"] },
    { slug: "browser-tabs", prefixes: ["tab_"] },
  ];

/**
 * The shared image store both editors read.
 *
 * Listed rather than matched by prefix: a prefix rule would make the NAME
 * decide the group, and this group's members are defined by which store they
 * touch, not by what they are called.
 */
const GALLERY = ["gallery_image_add"] as const;

const EXPLICIT: ReadonlyArray<{ slug: string; tools: readonly string[] }> = [
  { slug: "connection", tools: ["datalab_browsers"] },
  { slug: "gallery", tools: GALLERY },
  { slug: "blog-brief", tools: BLOG_BRIEF },
  { slug: "blog-insights", tools: BLOG_INSIGHTS },
  { slug: "keyword-research", tools: RESEARCH },
  { slug: "editor-control", tools: EDITOR_CONTROL },
  // Named like the group but caught by none of its prefixes, so it is listed
  // explicitly — a similar name is not a membership rule.
  { slug: "benchmark", tools: ["benchmark_gap"] },
];

const META: ReadonlyArray<Omit<Toolset, "tools">> = [
  {
    slug: "connection",
    label: "연결 브라우저",
    summary: "여러 브라우저·프로필 중 도구를 실행할 곳을 고른다",
    aliases: ["브라우저 선택", "프로필 선택", "크롬 연결", "웨일 연결"],
    dataScope: "local",
  },
  {
    slug: "blog-brief",
    label: "오늘의 블로그 브리핑",
    summary: "내 블로그가 지금 어떤지 — 방문·조회·인기글·실시간",
    aliases: ["내 블로그 성과", "방문자", "조회수", "인기글", "실시간 통계"],
    dataScope: "own",
  },
  {
    slug: "blog-insights",
    label: "블로그 심층 분석",
    summary: "왜 그런지 — 유입 경로·성별연령·체류·수익·글별 상세",
    aliases: ["블로그 유입", "독자 분석", "체류시간", "재방문", "블로그 수익"],
    dataScope: "own",
  },
  {
    slug: "keyword-research",
    label: "키워드·글감 리서치",
    summary:
      "무엇을 쓸지 — 키워드 수요·연관어·자동완성·발행량·지식iN 질문·지역 트렌드",
    aliases: [
      "키워드 조사",
      "검색량",
      "연관어",
      "글감",
      "콘텐츠 아이디어",
      "블로그 글 목차",
      "SEO AEO GEO",
      "콘텐츠 캘린더",
      "블로그 초안",
    ],
    dataScope: "mixed",
    steps: [
      "search_keywords 로 수요를 본다",
      "content_volume 으로 이미 얼마나 쓰였는지 본다 — 수요만 보고 고르면 포화된 키워드를 고른다",
      "keyword_opportunity 로 둘을 견줘 빈틈을 찾는다",
    ],
  },
  {
    slug: "serp-watch",
    label: "네이버 검색결과 확인",
    summary: "이 검색어에 지금 네이버가 무엇을 띄우는지",
    aliases: [
      "네이버 검색결과",
      "상위 노출",
      "검색 순위",
      "SERP",
      "상위 글 구조",
      "상위 글 패턴",
    ],
    dataScope: "public",
  },
  {
    // The summary says whose page it is, because this is the one group whose
    // tools act somewhere the member does not own.
    slug: "pumasi",
    label: "품앗이 — 다른 사람의 글",
    summary:
      "다른 사람의 블로그에서 댓글칸·이웃추가 창을 열고 내 공감 상태를 읽는다",
    aliases: ["품앗이", "공감 상태", "댓글 작성", "이웃 신청", "서로이웃"],
    dataScope: "mixed",
  },
  {
    // Not a subject and not somebody's page: the member's own browser. Here so
    // a caller that needs to point another tool at a particular tab can find
    // the way to do it, rather than opening a second tab of the same page.
    slug: "browser-tabs",
    label: "내 브라우저 탭",
    summary: "지금 열려 있는 탭을 보고, 열고, 앞으로 가져오고, 닫는다",
    aliases: ["브라우저 탭", "탭 열기", "탭 닫기", "탭 전환"],
    dataScope: "local",
    // The two named here are how this group's surface is created and reduced,
    // and a guard holds them equal to the surface policy - one place would go
    // stale on its own otherwise.
    openerTool: "tab_open",
    reducerTool: "tab_close",
  },
  {
    slug: "benchmark",
    label: "경쟁자 벤치마킹",
    summary: "다른 블로그·카페·인플루언서가 무엇을 하는지",
    aliases: [
      "경쟁 블로그",
      "경쟁자 분석",
      "벤치마킹",
      "다른 블로그",
      "저 블로그",
      "카페 프로필",
      "카페 메뉴",
      "카페 인기글",
      "인플루언서 분석",
      "인플루언서 채널",
      "인플루언서 카테고리",
    ],
    dataScope: "public",
  },
  {
    slug: "place",
    label: "네이버 플레이스 관리",
    summary: "내 매장 정보·리뷰·예약·쿠폰·대기",
    aliases: [
      "우리 매장",
      "플레이스 운영",
      "플레이스 리뷰",
      "플레이스 사진",
      "주변 업체",
      "예약",
      "쿠폰",
      "매장 평판",
    ],
    dataScope: "own",
  },
  {
    slug: "shopping",
    label: "쇼핑 인사이트",
    summary: "이 상품이 언제 누구에게 팔리는지",
    aliases: ["쇼핑 트렌드", "상품 수요", "카테고리 판매", "구매 연령"],
    dataScope: "public",
  },
  {
    slug: "ad-bidding",
    label: "검색광고 입찰",
    // The calls themselves cost nothing, hence the read tier, but they return
    // data only when the user's search-ad account credentials are present.
    summary: "입찰가와 예상 성과 — 무료, 검색광고 계정 자격증명 필요",
    aliases: ["검색광고", "광고 입찰", "입찰가", "광고 성과", "광고비"],
    dataScope: "own",
  },
  {
    slug: "store-settlement",
    label: "스토어 정산·매출",
    // The seller's own money. Nothing here writes, and the payout account the
    // settlement response carries is dropped before it reaches a host.
    summary: "정산 예정일과 금액, 일별 매출 — 커머스API 자격증명 필요",
    aliases: ["스토어 정산", "정산 예정", "매출", "커머스 주문"],
    dataScope: "own",
  },
  {
    slug: "comment-stats",
    label: "댓글 반응 통계",
    summary: "뉴스 댓글이 언제 누구에게 달리는지",
    aliases: ["뉴스 댓글", "댓글 반응", "댓글 성별", "댓글 시간대"],
    dataScope: "public",
  },
  {
    slug: "editor-control",
    label: "글쓰기 창 제어",
    summary: "열려 있는 네이버 글쓰기 창의 원고를 읽고 고친다",
    aliases: ["블로그 글쓰기", "열린 원고", "초안 수정", "제목 수정"],
    dataScope: "local",
    needsTab: true,
    openerTool: "editor_open_window",
    reducerTool: "editor_reduce_windows",
    steps: [
      "editor_read 로 지금 글에 무엇이 있는지 먼저 확인한다 — 빈 줄 알고 덮어쓰는 것이 가장 흔한 사고다",
      "고칠 내용을 만든다",
      "editor_place_draft 로 넣는다. 이미 내용이 있으면 지우지 않고 거절하며 다음 도구를 알려 준다",
      "전체를 갈아엎어야 할 때만, 사용자에게 물어본 뒤 editor_replace 를 쓴다",
    ],
  },
  {
    slug: "photo-editor",
    label: "사진 편집기 조작",
    summary: "사진 편집기 캔버스에 텍스트·도형·이미지를 넣는다",
    aliases: ["사진 편집기", "카드뉴스", "캔버스", "슬라이드 디자인"],
    dataScope: "local",
    needsTab: true,
    reducerTool: "editor_reduce_windows",
  },
  {
    slug: "video-editor",
    label: "영상 편집기 조작",
    summary: "영상 편집기의 장면·자막·목소리를 만든다",
    aliases: [
      "영상 편집기",
      "숏폼",
      "릴스",
      "영상 장면 추가",
      "영상 자막 설정",
      "장면",
      "자막",
      "AI 목소리",
    ],
    dataScope: "local",
    needsTab: true,
    reducerTool: "editor_reduce_windows",
  },
  {
    slug: "gallery",
    label: "이미지 갤러리",
    summary:
      "내가 만든 사진 파일을 갤러리에 넣어 두 편집기에서 쓴다 — 편집기 창이 없어도 된다",
    aliases: ["이미지 갤러리", "사진 가져오기", "이미지 보관"],
    dataScope: "local",
    steps: [
      "gallery_image_add 로 갤러리에 먼저 넣는다",
      "편집기 쪽 도구로 그 ref 를 가져다 쓴다 — 갤러리를 거치면 편집기 창이 없어도 미리 준비할 수 있다",
    ],
  },
];

/**
 * Catch-all for tools no group claimed.
 *
 * Meant to stay empty, but never removed: a new tool matched by neither a
 * prefix nor an explicit list would otherwise disappear from the catalog with
 * nothing failing anywhere. Here it stays findable.
 */
const FALLBACK_SLUG = "other";

function slugFor(name: string): string {
  for (const e of EXPLICIT) {
    if (e.tools.includes(name)) return e.slug;
  }
  for (const p of BY_PREFIX) {
    if (p.prefixes.some((x) => name.startsWith(x))) return p.slug;
  }
  return FALLBACK_SLUG;
}

/**
 * Split a list of names into groups. The caller passes the live catalog, so
 * this module never learns the tool registry and the list stays in one place.
 */
export function buildToolsets(names: readonly string[]): Toolset[] {
  const byslug = new Map<string, string[]>();
  for (const n of names) {
    const s = slugFor(n);
    (byslug.get(s) ?? byslug.set(s, []).get(s)!).push(n);
  }
  const out: Toolset[] = [];
  for (const m of META) {
    const tools = byslug.get(m.slug) ?? [];
    if (tools.length > 0) out.push({ ...m, tools });
    byslug.delete(m.slug);
  }
  const leftover = byslug.get(FALLBACK_SLUG) ?? [];
  if (leftover.length > 0) {
    out.push({
      slug: FALLBACK_SLUG,
      label: "그 밖의 도구",
      summary: "아직 묶음이 정해지지 않은 도구",
      aliases: ["기타"],
      dataScope: "mixed",
      tools: leftover,
    });
  }
  return out;
}

/** Which group a name belongs to, or null when none claims it. */
export function toolsetOf(name: string): string | null {
  const s = slugFor(name);
  return s === FALLBACK_SLUG ? null : s;
}
