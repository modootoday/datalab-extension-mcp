/**
 * The brand ASCII banner for the connector's command-line surfaces.
 *
 * 🔴 Inlined rather than imported: this package is published standalone, so a
 * cross-package import would not survive that build. Plain text only — the
 * output is piped to a log as often as it is watched, and a colour escape in a
 * redirected stream is noise rather than brand.
 */

/** The art rows plus the wordmark line. Frozen. */
const ART = [
  "██████╗  █████╗ ████████╗ █████╗ ██╗      █████╗ ██████╗",
  "██╔══██╗██╔══██╗╚══██╔══╝██╔══██╗██║     ██╔══██╗██╔══██╗",
  "██║  ██║███████║   ██║   ███████║██║     ███████║██████╔╝",
  "██║  ██║██╔══██║   ██║   ██╔══██║██║     ██╔══██║██╔══██╗",
  "██████╔╝██║  ██║   ██║   ██║  ██║███████╗██║  ██║██████╔╝",
  "╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝",
  "─────────────────────────── 데이터랩툴즈 · datalab.tools",
];

/**
 * Prints the banner and a one-line subtitle. Called once, as the first output
 * of a run, so the greeting lands before any prompt or scan.
 */
export function printBanner(
  out: (line: string) => void,
  subtitle: string,
): void {
  out("");
  for (const row of ART) {
    out(row);
  }
  out("");
  out(`  [데이터랩툴즈] ${subtitle}`);
  out("");
}

/** The install and uninstall subtitles, matching the README's voice. */
export const INSTALL_SUBTITLE = "커넥터 설치 도우미";
export const UNINSTALL_SUBTITLE = "커넥터 정리 도우미";
