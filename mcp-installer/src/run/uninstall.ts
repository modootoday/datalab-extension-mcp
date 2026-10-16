/**
 * The uninstall run: what install added comes out again, program by program,
 * and the person is told how to switch the browser side off as well.
 */
import { uninstallGlobally } from "../global-install.js";
import { catalogCommand } from "../hosts.js";
import {
  BROWSER_CARD,
  GLOBAL_UNINSTALLED,
  NOTHING_CHANGED,
  UNINSTALL_DONE,
  UNINSTALL_NOTHING_FOUND,
  UNINSTALL_QUESTION,
  UNINSTALL_SURFACES,
  UNINSTALL_TITLE,
  foundRemaining,
} from "../strings.js";
import type { Io, RunOptions } from "../types.js";
import { createUi, terminalCaps, type Ui } from "../ui.js";
import { validateUninstallOptions } from "../validate.js";
import { answeredNo } from "./answer.js";
import { removeCatalog } from "./catalog.js";
import { detectHosts, filterByRequestedHosts } from "./detect.js";
import { removeExtension } from "./extension.js";
import { cleanupLegacySkills } from "./legacy-skills.js";
import { hostReport, printHostReports, type Outcome } from "./report.js";

export async function runUninstall(opts: RunOptions, io: Io): Promise<number> {
  const ui = createUi((line) => io.out(line), terminalCaps(io));
  ui.banner(UNINSTALL_TITLE, `v${opts.version}`);
  ui.blank();

  const refusal = validateUninstallOptions(opts);
  if (refusal !== null) {
    ui.notice("실패", [refusal]);
    return 1;
  }

  const hosts = filterByRequestedHosts(await detectHosts(io), opts.hosts);
  if (hosts.length === 0) {
    ui.text(UNINSTALL_NOTHING_FOUND);
    closing(ui);
    return 0;
  }

  ui.text(foundRemaining(hosts.length));
  ui.blank();
  ui.table(
    hosts.map(
      (host) => [host.displayName, surfacesOf(host.id, opts.skills)] as const,
    ),
  );
  ui.blank();
  if (
    opts.yes !== true &&
    answeredNo(await io.ask(ui.question(UNINSTALL_QUESTION)))
  ) {
    ui.blank();
    ui.text(NOTHING_CHANGED);
    return 0;
  }
  ui.blank();

  const verbose = opts.verbose === true;
  const reports = [];
  for (const host of hosts) {
    const outcomes: Outcome[] = [await removeExtension({ io, verbose }, host)];
    const catalog =
      opts.skills === false ? null : await removeCatalog(io, host);
    if (catalog !== null) outcomes.push(catalog);
    reports.push(hostReport(host, outcomes));
  }
  printHostReports(ui, reports);

  await cleanupLegacySkills(io, new Set(hosts.map((host) => host.id)));
  if (await uninstallGlobally(io, { inheritStdio: verbose })) {
    ui.blank();
    ui.notice("정리", [GLOBAL_UNINSTALLED]);
  }
  ui.blank();
  closing(ui);

  const failed = reports.some((report) =>
    report.rows.some((row) => row.status === "실패"),
  );
  return failed ? 1 : 0;
}

/** The catalog is only ever written where its own command registered it. */
function surfacesOf(hostId: string, skills: boolean | undefined): string {
  if (skills === false || catalogCommand(hostId) === null) {
    return UNINSTALL_SURFACES.extension;
  }
  return UNINSTALL_SURFACES.both;
}

function closing(ui: Ui): void {
  ui.summary("ok", UNINSTALL_DONE);
  ui.card("info", BROWSER_CARD.title, BROWSER_CARD.lines);
}
