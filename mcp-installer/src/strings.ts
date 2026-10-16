/**
 * Frozen user-facing copy, as approved in the output proposal. Tests pin these
 * lines, so an edit here is a copy decision rather than a refactor.
 */

export const INSTALL_TITLE = "데이터랩툴즈 연결 도우미";
export const UNINSTALL_TITLE = "데이터랩툴즈 연결 정리";

export const INSTALL_STEPS = {
  key: "연결 키",
  find: "AI 프로그램 찾기",
  connect: "연결하기",
  finish: "마무리",
} as const;

export const SURFACE = {
  extension: "데이터랩툴즈 확장",
  catalog: "스킬 카탈로그",
} as const;

export const SURFACE_NOTE = {
  extension: "내 브라우저의 네이버 데이터",
  catalog: "마케팅·기획·법무 업무 요령",
} as const;

// --- 1. connection key ----------------------------------------------------

export const TOKEN_PROMPT_GUIDE: readonly string[] = [
  "크롬 확장 설정 › 다른 AI 앱에 연결 (MCP)",
  "› 1번 [연결 키]를 복사해 붙여넣어 주세요.",
];
export const TOKEN_PROMPT_QUESTION = "  연결 키:";
export const TOKEN_PROMPT_RETRY =
  "연결 키 형식이 맞지 않아요. 다시 복사해 붙여넣어 주세요.";
export const TOKEN_CONFIRMED = "연결 키를 확인했어요.";
export const TOKEN_REQUIRED = "연결 키가 필요해요.";
export const TOKEN_REQUIRED_CARD = {
  title: "이렇게 해 주세요",
  lines: [
    "크롬 확장 설정 › 다른 AI 앱에 연결 (MCP)",
    "› 2번 명령의 [복사]를 눌러, 복사된 명령을 그대로",
    "  붙여넣어 실행해 주세요.",
  ],
} as const;

// --- 2. finding programs ----------------------------------------------------

export function foundPrograms(count: number): string {
  return `${String(count)}개를 찾았어요.`;
}
export const METHOD_AUTO = "자동으로 연결";
export const METHOD_MANUAL = "안내대로 직접 추가";
export const TWO_SURFACES = "각 프로그램에 두 가지를 연결해요.";
export const ONE_SURFACE = "각 프로그램에 데이터랩툴즈 확장을 연결해요.";
export const INSTALL_QUESTION = "연결할까요?";
export const NOTHING_CHANGED = "아무것도 바꾸지 않았어요.";

export const NO_HOSTS_DETECTED = "연결할 수 있는 AI 프로그램을 찾지 못했어요.";
export const ALREADY_INSTALLED_CARD = {
  title: "이미 설치했다면",
  lines: [
    "설정 파일은 프로그램을 처음 쓸 때 만들어져요.",
    "아래를 한 번 한 뒤 다시 실행해 주세요.",
    "· ChatGPT 데스크톱  설정 › MCP 서버 › 서버 추가",
    "· VS Code          명령 팔레트 › MCP: Open User Configuration",
  ],
} as const;
export const SUPPORTED_APPS_TITLE = "지원하는 프로그램";
export const AFTER_INSTALL_RETRY =
  "프로그램을 설치한 뒤 같은 명령을 다시 실행해 주세요.";

/** The optional CLI-install offer, shown only when a scan finds nothing. */
export const CLI_OFFER_INTRO = [
  "원하면 아래 AI 프로그램 중 하나를 지금 설치할 수 있어요.",
  "안 해도 괜찮아요.",
] as const;
export const CLI_OFFER_SKIP_LABEL = "지금은 설치하지 않기";
export const CLI_OFFER_QUESTION = "  설치할 번호를 입력해 주세요";
export function cliInstalling(name: string): string {
  return `${name}을(를) 설치하고 있어요…`;
}
export function cliInstalled(name: string): string {
  return `${name} 설치를 마쳤어요.`;
}
export function cliInstallFailed(name: string): string {
  return `${name} 설치가 실패했어요. 직접 설치한 뒤 다시 실행해 주세요.`;
}
export function cliInstalledRetry(name: string): string {
  return `${name}을(를) 설치했어요. 터미널을 새로 열고 같은 명령을 다시 실행해 주세요.`;
}

// --- 3. connecting -----------------------------------------------------------

const FALLBACK_TAIL = [
  "AI 프로그램이 시작할 때마다 내려받아 실행해요.",
  "연결은 되고, 시작만 10초쯤 늦어져요.",
];

/** Why the connector was not installed on this machine, and what happens instead. */
export const GLOBAL_INSTALL_FALLBACK: Record<
  "unsupported" | "install-failed" | "not-found" | "path",
  readonly string[]
> = {
  unsupported: [
    "이 실행 환경에는 연결 프로그램을 설치하지 못해요.",
    ...FALLBACK_TAIL,
  ],
  "install-failed": [
    "이 컴퓨터에는 연결 프로그램을 설치하지 못했어요.",
    ...FALLBACK_TAIL,
  ],
  "not-found": ["설치한 연결 프로그램을 찾지 못했어요.", ...FALLBACK_TAIL],
  path: ["설치 경로에 쓸 수 없는 글자가 있어요.", ...FALLBACK_TAIL],
};

export function legacySkillsCleaned(count: number): readonly string[] {
  return [
    `예전에 설치한 데이터랩툴즈 스킬 파일 ${String(count)}개를 지웠어요.`,
    "이제 스킬은 스킬 카탈로그에서 받아요.",
  ];
}

export const RECLAIM = {
  retired: ["예전 연결 프로그램을 정리했어요."],
  foreign: [
    "포트 8765를 다른 프로그램이 쓰고 있어요.",
    "그 프로그램을 끄고 다시 실행해 주세요.",
  ],
  failed: [
    "예전 연결 프로그램을 정리하지 못했어요.",
    "AI 프로그램을 모두 종료한 뒤 다시 실행해 주세요.",
  ],
} as const;

export const DETAIL = {
  backedUp: "설정 파일을 바꾸기 전에 백업했어요.",
  created: "설정 파일이 없어 새로 만들었어요.",
  upToDate: "이미 최신이에요.",
  seeGuide: "(아래 안내)",
  parse: "설정 파일 형식을 읽을 수 없어 건드리지 않았어요.",
  verify: "쓴 내용을 확인하지 못해 백업으로 되돌렸어요.",
  commandFailed: "공식 명령이 실패했어요.",
  notRegistered: "등록된 항목이 없어요.",
} as const;

export const PERMISSION_DENIED_HINT =
  "파일 권한 때문에 설정을 쓸 수 없었어요. 권한을 확인하고 다시 실행해 주세요.";
export const UNEXPECTED_ERROR =
  "예상하지 못한 문제가 생겼어요. 다시 실행해 보고, 그래도 안 되면 알려 주세요.";

// --- 4. finishing ------------------------------------------------------------

export function summaryAllConnected(count: number): string {
  return `${String(count)}개 프로그램에 연결했어요.`;
}
export function summaryWithManual(count: number, manual: number): string {
  return `${String(count)}개 프로그램에 연결했어요. ${String(manual)}건은 직접 추가해 주세요.`;
}
export function summaryWithFailures(count: number, failed: number): string {
  return `${String(count)}개 프로그램에 연결했어요. ${String(failed)}개는 연결하지 못했어요.`;
}

export const MUST_DO_TITLE = "꼭 해 주세요";
export const RESTART_LINES: readonly string[] = [
  "AI 프로그램을 완전히 종료했다가 다시 실행해 주세요.",
  "   Windows 는 작업 표시줄 트레이 아이콘에서 종료해요.",
];
export const CATALOG_LOGIN_LINES: readonly string[] = [
  "스킬 카탈로그를 처음 쓸 때 modoo.today 로그인 창이",
  "   열려요. 한 번 로그인하면 그다음부터는 자동이에요.",
];

export function catalogGuideTitle(name: string): string {
  return `${name} 에 스킬 카탈로그 추가하기`;
}
export function extensionGuideTitle(name: string): string {
  return `${name} 에 직접 추가하기`;
}

// --- uninstall ---------------------------------------------------------------

export function foundRemaining(count: number): string {
  return `연결이 남아 있는 프로그램 ${String(count)}개를 찾았어요.`;
}
export const UNINSTALL_SURFACES = {
  both: "확장 · 스킬 카탈로그",
  extension: "확장",
} as const;
export const UNINSTALL_QUESTION = "연결을 해제할까요?";
export const UNINSTALL_NOTHING_FOUND = "정리할 연결을 찾지 못했어요.";
export const UNINSTALL_ROW = {
  extension: "데이터랩툴즈 확장 해제",
  catalog: "스킬 카탈로그 해제",
} as const;
export const GLOBAL_UNINSTALLED =
  "이 컴퓨터에 설치한 연결 프로그램도 지웠어요.";
export const UNINSTALL_DONE = "정리가 끝났어요.";
export const BROWSER_CARD = {
  title: "브라우저 쪽 연결도 끄려면",
  lines: [
    "데이터랩툴즈 패널 › 이 브라우저 연결 끄기",
    "이 컴퓨터 등록은 등록된 브라우저 목록에서 내릴 수 있어요.",
  ],
} as const;
