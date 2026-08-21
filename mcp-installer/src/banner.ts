/**
 * The brand ASCII banner for the connector's command-line surfaces.
 *
 * Inlined rather than imported: this package is published standalone, so a
 * cross-package import would not survive that build. Plain text only — the
 * output is piped to a log as often as it is watched, and a colour escape in a
 * redirected stream is noise rather than brand.
 */

/**
 * The wordmark line.
 *
 * One line, because many readers meet a terminal for the first time here: a
 * screenful of glyphs reads as something having gone wrong. The screen belongs
 * to what the tool is doing.
 */
const WORDMARK = "─────────────────────────── 데이터랩툴즈 · datalab.tools";

/**
 * Prints the banner and a one-line subtitle. Called once, as the first output
 * of a run, so the greeting lands before any prompt or scan.
 */
export function printBanner(
  out: (line: string) => void,
  subtitle: string,
): void {
  out("");
  out(WORDMARK);
  out(`  [데이터랩툴즈] ${subtitle}`);
}

/**
 * A step header, so the run reads as chapters instead of one scroll.
 *
 * Reuses the bracket label the result lines already use rather than introducing
 * a second vocabulary — and no colour, for the reason above.
 */
export function printStep(
  out: (line: string) => void,
  step: number,
  total: number,
  title: string,
): void {
  out("");
  out(`[${String(step)}/${String(total)}] ${title}`);
}

/** The install and uninstall subtitles, matching the README's voice. */
export const INSTALL_SUBTITLE = "연결 프로그램 설치 도우미";
export const UNINSTALL_SUBTITLE = "연결 프로그램 정리 도우미";
