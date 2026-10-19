/**
 * When the scan finds no program: offer to install a CLI in place (a choice,
 * never a push), and otherwise say how to get one.
 */
import {
  INSTALLABLE_CLIS,
  SUPPORTED_APPS,
  type InstallableCli,
} from "../hosts.js";
import {
  ALREADY_INSTALLED_CARD,
  AFTER_INSTALL_RETRY,
  CLI_OFFER_INTRO,
  CLI_OFFER_QUESTION,
  CLI_OFFER_SKIP_LABEL,
  NO_HOSTS_DETECTED,
  SUPPORTED_APPS_TITLE,
  cliInstallFailed,
  cliInstalled,
  cliInstalling,
} from "../strings.js";
import type { Io } from "../types.js";
import { displayWidth, type Ui } from "../ui.js";

/** The chosen CLI, or null when the person declines or no one is there to ask. */
export async function offerCliInstall(
  io: Io,
  ui: Ui,
): Promise<InstallableCli | null> {
  if (!io.isInteractive()) return null;
  ui.text(NO_HOSTS_DETECTED);
  ui.blank();
  for (const line of CLI_OFFER_INTRO) ui.text(line);
  ui.blank();
  ui.table([
    ...INSTALLABLE_CLIS.map(
      (cli, i) => [String(i + 1), cli.displayName] as const,
    ),
    ["0", CLI_OFFER_SKIP_LABEL],
  ]);
  ui.blank();
  const answer = await io.prompt(
    `${CLI_OFFER_QUESTION} (0-${String(INSTALLABLE_CLIS.length)}):`,
  );
  const n = Number(answer.trim());
  if (!Number.isInteger(n) || n < 1 || n > INSTALLABLE_CLIS.length) return null;
  return INSTALLABLE_CLIS[n - 1] ?? null;
}

/** Installs the chosen CLI globally, letting npm's own progress show. */
export async function installCli(
  io: Io,
  ui: Ui,
  cli: InstallableCli,
): Promise<boolean> {
  ui.blank();
  ui.text(cliInstalling(cli.displayName));
  let code = -1;
  try {
    const result = await io.spawn("npm", ["install", "-g", cli.npmPackage], {
      shell: io.platform === "win32",
      inheritStdio: true,
    });
    code = result.code;
  } catch {
    code = -1;
  }
  if (code === 0) {
    ui.notice("완료", [cliInstalled(cli.displayName)]);
    return true;
  }
  ui.notice("실패", [cliInstallFailed(cli.displayName)]);
  return false;
}

/**
 * The "already installed?" card leads: many people who reach this have an app
 * whose config does not exist until first use, and download links first would
 * tell them to redo what they already did.
 */
export function printSupportedApps(ui: Ui): void {
  ui.text(NO_HOSTS_DETECTED);
  ui.card("info", ALREADY_INSTALLED_CARD.title, ALREADY_INSTALLED_CARD.lines);
  const width = Math.max(
    ...SUPPORTED_APPS.map((app) => displayWidth(app.name)),
  );
  ui.card(
    "info",
    SUPPORTED_APPS_TITLE,
    SUPPORTED_APPS.map((app) => {
      const pad = " ".repeat(width - displayWidth(app.name) + 3);
      return `${app.name}${pad}${ui.link(app.url.replace(/^https:\/\//u, "").replace(/\/$/u, ""))}`;
    }),
  );
  ui.blank();
  ui.text(AFTER_INSTALL_RETRY);
}
