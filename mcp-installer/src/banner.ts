/**
 * The DATALAB brand ASCII banner — the canonical brand mark for the connector's
 * command-line surfaces. The same art the Ollama install helper prints
 * (`public/install/ollama.{sh,ps1}`); the two shell scripts carry the
 * byte-identical mark.
 *
 * Kept INLINE (not imported from a workspace brand-tokens package) on purpose:
 * this installer is a zero-dependency, self-contained artifact that is mirrored
 * to a standalone public repo and published as one tarball, so a cross-package
 * import would not survive the mirror build. Editing the art here is a brand
 * decision, and the Ollama scripts must be kept in lockstep.
 *
 * Plain text only — no ANSI color. Installer output is piped to a log at least
 * as often as it is watched by a human, and a color escape in a redirected
 * stream is noise, not brand. The glyphs are box-drawing + CJK only; nothing
 * here is secret, and nothing project-internal (hostnames, package internals,
 * architecture terms) belongs on this public surface.
 */

/** The six art rows + the divider/wordmark line. Frozen. */
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
 * Prints the banner followed by a one-line subtitle. Called once, as the very
 * first output of an install/uninstall run, so the greeting lands before any
 * prompt or scan — the same first-impression ordering the Ollama helper uses.
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

/** The install/uninstall subtitles — 해요체-adjacent, matching the README voice. */
export const INSTALL_SUBTITLE = "커넥터 설치 도우미";
export const UNINSTALL_SUBTITLE = "커넥터 정리 도우미";
