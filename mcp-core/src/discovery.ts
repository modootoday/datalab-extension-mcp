/**
 * The `datalab_*` façade — the only tool DEFINITIONS a host receives, with the
 * real catalog reached through them.
 *
 * Shared, not panel-owned, because the local server must be able to answer
 * `tools/list` before the panel has ever connected. Many hosts cache the first
 * list they are given: an empty list (or an error) there leaves the user at
 * zero tools for the whole session, with nothing to re-ask with. These five
 * names and schemas are fixed, so serving them cold costs no accuracy.
 *
 * The panel passes its live catalog; the server passes what it can name on its
 * own. Only the counts inside the descriptions differ, and the panel's list
 * replaces the cold one the moment it connects (`notifications/tools/list_changed`).
 */
import { READ_ONLY_TOOLS, TOOL_TIERS } from "./allowlist.js";
import { LOOKUP_ANNOTATIONS, type McpToolAnnotations } from "./annotations.js";
import type { McpTool } from "./tools.js";
import { buildToolsets } from "./toolsets.js";

export const CATALOG_TOOL = "datalab_catalog";
export const DESCRIBE_TOOL = "datalab_describe";
export const CALL_TOOL = "datalab_call";
export const CONFIRM_STATUS_TOOL = "datalab_confirm_status";
export const SESSION_STATE_TOOL = "datalab_session_state";
/**
 * Which Chromes are on the workbench right now.
 *
 * Read-only on purpose, and the distinction is load-bearing: issuing a
 * registration code creates a credential and stays operator-only, but knowing
 * which Chrome a call would land in is routing information. Without it a host
 * with two profiles connected cannot say where it wants a tool to run, and
 * every unaddressed call silently takes the oldest session.
 */
export const BROWSERS_TOOL = "datalab_browsers";

function browserProperty(): Record<string, unknown> {
  return {
    type: "string",
    description: `${BROWSERS_TOOL} 가 돌려준 실행 대상 브라우저 id`,
  };
}

/**
 * Names the bridge answers itself — no tier, no registry entry.  A name left
 * out here gets "no such tool" from planCall even though the bridge handles it.
 */
export const DISCOVERY_TOOLS: readonly string[] = [
  CATALOG_TOOL,
  DESCRIBE_TOOL,
  CALL_TOOL,
  CONFIRM_STATUS_TOOL,
  SESSION_STATE_TOOL,
  BROWSERS_TOOL,
];

export function isDiscoveryTool(name: string): boolean {
  return DISCOVERY_TOOLS.includes(name);
}

/**
 * How many schemas one describe answer carries.
 *
 * Published here as maxItems and enforced again where the answer is built.
 * Written twice, the two drift and the answer silently drops what the schema
 * said it would accept.
 *
 * Unrelated to BRIDGE_LIMITS.capacity, which is also 10 and is a burst
 * bucket. Neither may be derived from the other.
 */
export const DESCRIBE_PAGE_SIZE = 10;

export interface CatalogEntry {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** Tier-derived hints; used on the definition path only, not in catalog results. */
  annotations?: McpToolAnnotations;
}

/**
 * These descriptions are the only place the model learns the procedure, so they
 * state that a schema must be fetched once before calling.
 */
export function discoveryDescriptors(
  entries: readonly CatalogEntry[],
): CatalogEntry[] {
  const sets = buildToolsets(entries.map((e) => e.name));
  const names = sets.map((s) => s.slug).join(", ");
  return [
    {
      name: CATALOG_TOOL,
      description:
        `데이터랩툴즈가 할 수 있는 일의 목록을 돌려준다. 네이버 블로그·키워드·검색결과·` +
        `플레이스·쇼핑·광고 통계와 글쓰기/사진/영상 편집기 제어까지 ${entries.length}개 도구가 있고, ` +
        `여기 정의로 보이는 것은 그중 일부다. **사용자가 무엇을 부탁하든, 지금 보이는 도구로 ` +
        `안 되면 먼저 이것을 불러라** — 없다고 답하기 전에 확인한다. ` +
        `toolset 없이 부르면 묶음 목록, 주면 그 묶음의 도구 이름과 설명. 묶음: ${names}.`,
      annotations: LOOKUP_ANNOTATIONS,
      inputSchema: {
        type: "object",
        properties: {
          toolset: {
            type: "string",
            enum: sets.map((s) => s.slug),
            description: "이 묶음의 도구 목록을 본다. 생략하면 묶음 목록만",
          },
          query: {
            type: "string",
            description:
              "찾는 말(예: '방문자', '경쟁'). 이름과 설명에서 찾고, 묶음 이름이 맞으면 그 묶음도 함께 돌려준다",
          },
          withSchemas: {
            type: "boolean",
            description: `인자 스키마까지 함께 받는다 — 그러면 ${DESCRIBE_TOOL} 없이 바로 실행할 수 있다. toolset 이나 query 와 같이 줄 때만 쓴다`,
          },
          browser: browserProperty(),
        },
        additionalProperties: false,
      },
    },
    {
      name: DESCRIBE_TOOL,
      description:
        `도구의 인자 스키마를 돌려준다. **${CALL_TOOL} 로 부르기 전에 그 도구에 대해 ` +
        `최소 한 번은 이것을 호출해라** — 인자 이름과 필수 여부를 지어내면 거절되고, ` +
        `왕복이 한 번 더 든다. 이미 스키마를 받아 둔 도구는 다시 부를 필요 없다.`,
      annotations: LOOKUP_ANNOTATIONS,
      inputSchema: {
        type: "object",
        properties: {
          tools: {
            type: "array",
            items: { type: "string" },
            maxItems: DESCRIBE_PAGE_SIZE,
            description: `스키마를 볼 도구 이름 (한 번에 ${DESCRIBE_PAGE_SIZE}개까지)`,
          },
          browser: browserProperty(),
        },
        required: ["tools"],
        additionalProperties: false,
      },
    },
    {
      name: CALL_TOOL,
      description:
        `${CATALOG_TOOL} 로 찾은 도구를 실행한다. args 는 ${DESCRIBE_TOOL} 가 준 스키마를 ` +
        `그대로 따른다 — 맞지 않으면 실행하지 않고 무엇이 틀렸는지 돌려준다. ` +
        `문서를 고치거나 요금이 드는 도구는 사용자에게 확인을 받은 뒤에 실행된다.`,
      // Deliberately unannotated: this tool's effect is the delegated tool's
      // effect, so any fixed hint would be half false. Tier is judged at run time.
      inputSchema: {
        type: "object",
        properties: {
          tool: { type: "string", description: "실행할 도구 이름" },
          args: {
            type: "object",
            description: `그 도구의 인자. ${DESCRIBE_TOOL} 의 스키마를 따른다`,
          },
          browser: browserProperty(),
        },
        required: ["tool"],
        additionalProperties: false,
      },
    },
    {
      name: CONFIRM_STATUS_TOOL,
      description:
        `사용자 확인을 기다리는 호출의 결과를 가져온다. ${CALL_TOOL} 이 ` +
        `\`awaiting_confirm\` 과 ticket 을 돌려줬을 때만 쓴다. 아직 답이 없으면 ` +
        `\`pending\` 이니 몇 초 뒤 다시 확인해라 — **원래 도구를 다시 부르지 마라**, ` +
        `확인 창이 하나 더 뜨고 요금이 드는 작업이면 두 번 청구된다.`,
      annotations: LOOKUP_ANNOTATIONS,
      inputSchema: {
        type: "object",
        properties: {
          ticket: {
            type: "string",
            description: `${CALL_TOOL} 이 돌려준 ticket 값 그대로`,
          },
          browser: browserProperty(),
        },
        required: ["ticket"],
        additionalProperties: false,
      },
    },
  ];
}

export function sessionStateDescriptor(): CatalogEntry {
  return {
    name: SESSION_STATE_TOOL,
    description:
      "지금 이 브라우저에서 확인 창 없이 얼마나 더 작업할 수 있는지, 그리고 작업할 대상이 실제로 열려 있는지 알려준다. 여러 번의 편집이나 배치를 시작하기 전에 먼저 부른다 — 남은 시간이 짧으면 도중에 확인 창이 뜨기 시작하고, 사용자가 자리에 없으면 거기서 멈춘다. surfaces 는 글쓰기 창·사진 편집기·영상 편집기가 각각 준비됐는지 말해준다. ready 가 아닌 표면을 쓰는 계획은 매 호출이 실패하니, 계획을 세우기 전에 확인하고 필요하면 사용자에게 열어 달라고 안내한다.",
    inputSchema: {
      type: "object",
      properties: { browser: browserProperty() },
      additionalProperties: false,
    },
    annotations: LOOKUP_ANNOTATIONS,
  };
}

export function browsersDescriptor(): CatalogEntry {
  return {
    name: BROWSERS_TOOL,
    description:
      "이 컴퓨터에 지금 연결돼 있는 브라우저를 알려준다. 크롬·웨일·엣지 어느 것이든, 프로필을 여러 개 연결해 둔 사용자에게는 도구가 어디서 실행되는지가 결과를 바꾼다 — 열려 있는 글도 로그인한 계정도 프로필마다 다르다. 목록의 id 를 다른 도구 호출의 browser 인자에 넣으면 그 브라우저에서 실행된다. 생략하면 고정된 기본 브라우저를 사용하며, 그 연결이 끊긴 동안 변경 작업은 다른 브라우저로 자동 승계하지 않는다. 둘 이상이면 어디서 할지 사용자에게 확인하고 지정한다. 이 도구는 조회만 한다 — 브라우저를 새로 붙이는 것은 사용자가 확장 설정에서 연결 키를 넣어서 한다.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: LOOKUP_ANNOTATIONS,
  };
}

/** Every tool name this build knows of, for the cold descriptor counts. */
function allowlistNames(): string[] {
  return [...new Set([...READ_ONLY_TOOLS, ...Object.keys(TOOL_TIERS)])];
}

/**
 * The façade to serve when no panel has ever connected.
 *
 * Never an empty list and never an error: a host that caches zero tools has
 * no way back until it restarts. The counts come from this build's allowlist,
 * so a pinned server can only be stale about how many tools exist — never about
 * how to reach them, which is what these descriptions actually teach.
 */
export function staticDiscoveryCatalog(): McpTool[] {
  const entries = allowlistNames().map((name) =>
    name === BROWSERS_TOOL
      ? browsersDescriptor()
      : { name, description: "", inputSchema: {} },
  );
  return [
    ...discoveryDescriptors(entries),
    sessionStateDescriptor(),
    browsersDescriptor(),
  ].map(
    (e): McpTool => ({
      name: e.name,
      description: e.description,
      inputSchema: e.inputSchema,
      ...(e.annotations
        ? { annotations: { ...e.annotations } as Record<string, unknown> }
        : {}),
    }),
  );
}
