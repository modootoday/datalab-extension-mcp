/**
 * Frozen user-facing copy. Several of these are byte-exact contracts pinned
 * by tests, matching the panel's own cards and the README's troubleshooting
 * titles character for character, so an edit here is a copy decision.
 */

/**
 * The mandatory final line of every successful install. Host apps read their
 * config only at launch, so without it the install works and nothing happens.
 */
export const RESTART_NOTICE =
  "마지막 한 단계: AI 앱을 완전히 종료했다가 다시 실행해 주세요.\n(Windows: 작업 표시줄 트레이 아이콘에서 종료)";

export const NOTHING_CHANGED = "아무것도 바꾸지 않았어요.";

export const UNINSTALL_DONE = "정리가 끝났어요.";

export const UNINSTALL_TOKEN_REMINDER =
  "이 브라우저의 로컬 연결 정보도 지우려면 데이터랩툴즈 패널에서 '이 브라우저 연결 끄기'를 눌러 주세요. 이 컴퓨터의 등록은 등록된 브라우저 목록에서 별도로 내릴 수 있어요.";

export const PERMISSION_DENIED_HINT =
  "파일 권한 때문에 설정을 쓸 수 없었어요. 파일 권한을 확인한 뒤 같은 명령어를 다시 실행해 주세요.";

export const NO_HOSTS_DETECTED = "연결할 수 있는 AI 프로그램을 찾지 못했어요.";

export const SUPPORTED_APPS_HEADER = "지원하는 프로그램과 다운로드 주소예요:";

export const AFTER_INSTALL_RETRY =
  "프로그램을 설치한 뒤 같은 명령어를 다시 실행해 주세요.";

/**
 * Answers "I already installed it and it was not found". Several hosts create
 * their config on first use inside the app rather than at install time, so
 * there is nothing for us to see yet — and the fix is the action that creates
 * the file, not another download.
 */
export const ALREADY_INSTALLED_HINT =
  "이미 설치했는데 목록에 없다면, 설정 파일이 아직 만들어지지 않았을 수 있어요. 설정 파일은 프로그램을 설치할 때가 아니라 처음 쓸 때 만들어져요:\n" +
  "  - ChatGPT 데스크톱: 설정 → MCP 서버 → 서버 추가를 한 번 실행\n" +
  "  - VS Code: 명령 팔레트(Ctrl+Shift+P) → 'MCP: Open User Configuration' 실행\n" +
  "그 뒤 같은 명령어를 다시 실행하면 찾을 수 있어요.";

/**
 * The interactive token prompt: guidance, then a short question. This is the
 * short command's path, where pasting one token is far more robust for a
 * non-technical user than copying a long command that wraps and gets
 * half-selected.
 */
export const TOKEN_PROMPT_GUIDE =
  "크롬 확장 설정 → '다른 AI 앱에 연결 (MCP)' → 1번 [연결 키]의 값을 복사해 주세요.";
export const TOKEN_PROMPT_QUESTION = "복사한 연결 키를 붙여넣어 주세요:";
export const TOKEN_PROMPT_RETRY =
  "연결 키 형식이 올바르지 않아요. 설정 화면에서 다시 복사해 붙여넣어 주세요.";

/**
 * For a missing token with no human to ask, because stdin is piped. It has to
 * name the next step rather than report a format error, which reads as a
 * failure instead of an instruction.
 */
export const TOKEN_REQUIRED_NON_INTERACTIVE =
  "연결 키가 필요해요. 크롬 확장 설정 → '다른 AI 앱에 연결 (MCP)' → 2번 명령의 [복사] 버튼을 눌러, 복사된 명령을 그대로 붙여넣어 실행해 주세요.";

/**
 * The optional CLI-install offer, shown only when a scan finds nothing and a
 * human is present.  A choice, never a push: declining is a first-class
 * outcome that falls through to the download list.
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

/** The one and only question of the install flow. */
export function installQuestion(count: number): string {
  return `위 ${count}개 프로그램에 연결할까요?`;
}

/** The uninstall counterpart, under the same single-question contract. */
export function uninstallQuestion(count: number): string {
  return `위 ${count}개 프로그램에서 연결을 해제할까요?`;
}
