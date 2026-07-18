/**
 * Frozen user-facing copy. Everything here is 해요체 and several strings are
 * byte-exact contracts pinned by tests — the red-card copy in the panel and
 * the README troubleshooting titles must match these character for character,
 * so edits here are copy decisions, not refactors.
 */

/**
 * The mandatory final line of every successful install. Every host app reads
 * its config only at launch, so without this line the install "works" and
 * nothing happens — the single most common support ticket shape.
 */
export const RESTART_NOTICE =
  "마지막 한 단계: AI 앱을 완전히 종료했다가 다시 실행해 주세요.\n(Windows: 작업 표시줄 트레이 아이콘에서 종료)";

export const NOTHING_CHANGED = "아무것도 바꾸지 않았어요.";

export const UNINSTALL_DONE = "정리가 끝났어요.";

export const UNINSTALL_TOKEN_REMINDER =
  "연결 토큰까지 없애려면 데이터랩툴즈 패널에서 '연동 해제' 버튼을 눌러 주세요. 폐기된 토큰은 설정에 남은 항목을 전부 무력화해요.";

export const PERMISSION_DENIED_HINT =
  "파일 권한 때문에 설정을 쓸 수 없었어요. 파일 권한을 확인한 뒤 같은 명령어를 다시 실행해 주세요.";

export const NO_HOSTS_DETECTED = "연결할 수 있는 AI 프로그램을 찾지 못했어요.";

export const SUPPORTED_APPS_HEADER = "지원하는 프로그램과 다운로드 주소예요:";

export const AFTER_INSTALL_RETRY =
  "프로그램을 설치한 뒤 같은 명령어를 다시 실행해 주세요.";

/**
 * The interactive token prompt. Shown as guidance, then a short prompt.
 *
 * This is the path the bare `install` command takes: the user runs a short
 * command and pastes just the token, instead of copying one long line. For a
 * non-technical user, pasting a token is far more robust than copying a full
 * command that line-wraps and gets half-selected.
 */
export const TOKEN_PROMPT_GUIDE =
  "크롬에서 데이터랩툴즈 사이드 패널을 열고 'MCP 연결' 카드의 연결 토큰을 복사해 주세요.";
export const TOKEN_PROMPT_QUESTION =
  "복사한 연결 토큰을 여기에 붙여넣어 주세요:";
export const TOKEN_PROMPT_RETRY =
  "토큰 형식이 올바르지 않아요. 카드의 토큰을 다시 복사해서 붙여넣어 주세요.";

/**
 * When the token is missing AND we cannot ask for it — stdin is piped, so
 * there is no human to prompt. Tell them how to pass it on the command line.
 * This is the state that used to silently print "토큰 형식이 올바르지 않아요"
 * for a bare `install`, which read as an error rather than a next step.
 */
export const TOKEN_REQUIRED_NON_INTERACTIVE =
  "연결 토큰이 필요해요. 크롬에서 데이터랩툴즈 사이드 패널을 열고 'MCP 연결' 카드의 [설치 명령 복사] 버튼을 눌러, 복사된 명령을 그대로 붙여넣어 실행해 주세요.";

/**
 * The optional CLI-install offer, shown ONLY when a scan finds zero hosts and a
 * human is at the keyboard. The offer is a choice, never a push: declining
 * (option 0) is a first-class outcome that falls through to the download list.
 */
export const CLI_OFFER_INTRO =
  "원하시면 아래 AI 프로그램 중 하나를 지금 바로 설치할 수 있어요. Node.js 기반이라 이 자리에서 설치돼요 — 안 하셔도 괜찮아요.";
export const CLI_OFFER_SKIP_LABEL = "0. 지금은 설치하지 않기";
export const CLI_OFFER_QUESTION = "설치할 프로그램의 번호를 입력해 주세요";

export function cliInstalling(name: string, pkg: string): string {
  return `${name}을(를) 설치하고 있어요... (npm install -g ${pkg})`;
}
export function cliInstalled(name: string): string {
  return `${name} 설치를 마쳤어요.`;
}
export function cliInstallFailed(name: string): string {
  return `${name} 설치가 실패했어요. 잠시 뒤 다시 시도하거나 직접 설치한 뒤 같은 명령을 실행해 주세요.`;
}
export function cliInstalledRetry(name: string): string {
  return `${name}을(를) 설치했어요. 터미널을 새로 열고 같은 명령을 한 번 더 실행하면 연결돼요.`;
}

/** The one and only question of the install flow. Never any other question. */
export function installQuestion(count: number): string {
  return `위 ${count}개 프로그램에 연결할까요?`;
}

/** The uninstall counterpart — same single-question contract. */
export function uninstallQuestion(count: number): string {
  return `위 ${count}개 프로그램에서 연결을 해제할까요?`;
}
