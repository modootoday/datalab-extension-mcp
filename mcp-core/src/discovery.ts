/**
 * Six stable discovery definitions keep cold hosts non-empty until the panel connects.
 * The panel then replaces them through the standard list-changed notification.
 */
import { LOOKUP_ANNOTATIONS, type McpToolAnnotations } from "./annotations.js";
import type { McpTool } from "./tools.js";

export const FIND_TOOLS_TOOL = "datalab_find_tools";
export const LIST_TOOLS_TOOL = "datalab_list_tools";
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
  FIND_TOOLS_TOOL,
  LIST_TOOLS_TOOL,
  CALL_TOOL,
  CONFIRM_STATUS_TOOL,
  SESSION_STATE_TOOL,
  BROWSERS_TOOL,
];

export function isDiscoveryTool(name: string): boolean {
  return DISCOVERY_TOOLS.includes(name);
}

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
export function discoveryDescriptors(): CatalogEntry[] {
  return [
    {
      name: FIND_TOOLS_TOOL,
      description:
        "내 네이버 블로그 성과·유입·독자, 키워드·검색결과·경쟁, 플레이스 리뷰·예약, " +
        "쇼핑·광고·정산, 댓글·품앗이, 글쓰기와 데이터랩툴즈 사진·영상 편집 요청에 맞는 " +
        `숨은 도구를 찾는다. 사용자가 데이터랩이나 MCP를 말하지 않아도 이 범주라면 먼저 부르고, ` +
        `없다고 답하기 전에 확인한다. 원래 요청의 핵심 의도를 intent에 넣으면 최대 8개 후보의 ` +
        `스키마와 안전 범위를 돌려준다. 찾지 못하면 ${LIST_TOOLS_TOOL}로 이어갈 묶음 목록도 ` +
        `함께 돌려준다. 이것은 검색만 하며 계정·브라우저·탭을 읽거나 실행하지 않는다.`,
      annotations: LOOKUP_ANNOTATIONS,
      inputSchema: {
        type: "object",
        properties: {
          intent: {
            type: "string",
            minLength: 1,
            maxLength: 256,
            description:
              "사용자가 하려는 일의 핵심 문장. 도구 이름이나 toolset slug로 바꾸지 말고 사용자 표현을 유지한다",
          },
        },
        required: ["intent"],
        additionalProperties: false,
      },
    },
    {
      name: LIST_TOOLS_TOOL,
      description:
        `${FIND_TOOLS_TOOL}가 matched:false를 돌려줬거나 후보가 부족할 때 쓰는 폴백이다. ` +
        `toolset을 생략하면 전체 기능 묶음만 작게 돌려주고, 묶음을 고르면 그 안의 도구를 ` +
        `page/pageSize로 나눠 스키마와 안전 범위를 돌려준다. 평소에는 먼저 ${FIND_TOOLS_TOOL}를 써라. ` +
        `이것은 목록 조회만 하며 계정·브라우저·탭을 읽거나 실행하지 않는다.`,
      annotations: LOOKUP_ANNOTATIONS,
      inputSchema: {
        type: "object",
        properties: {
          toolset: {
            type: "string",
            minLength: 1,
            maxLength: 64,
            description:
              "find_tools의 fallback.toolsets에서 고른 toolset 값. 생략하면 전체 묶음 개요를 본다",
          },
          page: {
            type: "integer",
            minimum: 1,
            description: "고른 묶음에서 볼 페이지. 기본값 1",
          },
          pageSize: {
            type: "integer",
            minimum: 1,
            maximum: 20,
            description: "한 페이지의 도구 수. 기본값 8, 최대 20",
          },
        },
        additionalProperties: false,
      },
    },
    {
      name: CALL_TOOL,
      description:
        `${FIND_TOOLS_TOOL} 또는 ${LIST_TOOLS_TOOL}로 찾은 도구를 실행한다. args 는 검색 결과가 준 스키마를 ` +
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
            description: `그 도구의 인자. ${FIND_TOOLS_TOOL} 가 반환한 스키마를 따른다`,
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

/**
 * The façade to serve when no panel has ever connected.
 *
 * Never an empty list and never an error: a host that caches zero tools has
 * no way back until it restarts. The counts come from this build's allowlist,
 * so a pinned server can only be stale about how many tools exist — never about
 * how to reach them, which is what these descriptions actually teach.
 */
export function staticDiscoveryCatalog(): McpTool[] {
  return [
    ...discoveryDescriptors(),
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
