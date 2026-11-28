/**
 * The install run in three steps: finding programs, connecting both surfaces
 * to each, and the cards the person acts on. One program failing never stops
 * the others; each gets its own verdict.
 */
import { catalogCommand, type ServerEntryOptions } from "../hosts.js";
import { installGlobally } from "../global-install.js";
import { reclaimPort } from "../reclaim.js";
import {
  CATALOG_LOGIN_LINES,
  GLOBAL_INSTALL_FALLBACK,
  INSTALL_QUESTION,
  INSTALL_STEPS,
  INSTALL_TITLE,
  METHOD_AUTO,
  METHOD_MANUAL,
  MUST_DO_TITLE,
  NOTHING_CHANGED,
  ONE_SURFACE,
  PAIRING_LINES,
  RECLAIM,
  RESTART_LINES,
  SURFACE,
  SURFACE_NOTE,
  TWO_SURFACES,
  cliInstalledRetry,
  foundPrograms,
  legacySkillsCleaned,
  summaryAllConnected,
  summaryWithFailures,
  summaryWithManual,
} from "../strings.js";
import type { Io, RunOptions } from "../types.js";
import { createUi, terminalCaps, type Status, type Ui } from "../ui.js";
import { answeredNo } from "./answer.js";
import { installCatalog } from "./catalog.js";
import {
  detectHosts,
  filterByRequestedHosts,
  type DetectedHost,
} from "./detect.js";
import { resolveEntryOptions } from "./entry-options.js";
import { installExtension } from "./extension.js";
import { cleanupLegacySkills } from "./legacy-skills.js";
import { installCli, offerCliInstall, printSupportedApps } from "./offer.js";
import {
  hostReport,
  printCards,
  printHostReports,
  tally,
  type HostReport,
  type Outcome,
  type Tally,
} from "./report.js";

const STEPS = 3;

export async function runInstall(opts: RunOptions, io: Io): Promise<number> {
  const ui = createUi((line) => io.out(line), terminalCaps(io));
  ui.banner(INSTALL_TITLE, `v${opts.version}`);

  const resolved = resolveEntryOptions(opts);
  if (!resolved.ok) {
    ui.notice("실패", [resolved.refusal]);
    return 1;
  }
  const entryOpts = resolved.entry;

  ui.step(1, STEPS, INSTALL_STEPS.find);
  const found = await findPrograms(opts, io, ui);
  if (typeof found === "number") return found;
  const withCatalog = opts.skills === true;
  presentPlan(ui, found, withCatalog);
  if (
    opts.yes !== true &&
    answeredNo(await io.ask(ui.question(INSTALL_QUESTION)))
  ) {
    ui.blank();
    ui.text(NOTHING_CHANGED);
    return 0;
  }

  ui.step(2, STEPS, INSTALL_STEPS.connect);
  const reports = await connect(opts, io, ui, found, entryOpts, withCatalog);
  printHostReports(ui, reports);

  ui.step(3, STEPS, INSTALL_STEPS.finish);
  return finish(ui, reports, entryOpts.token === undefined);
}

/** The detected programs, or the exit code when there are none to connect. */
async function findPrograms(
  opts: RunOptions,
  io: Io,
  ui: Ui,
): Promise<DetectedHost[] | number> {
  const detected = filterByRequestedHosts(await detectHosts(io), opts.hosts);
  if (detected.length > 0) return detected;
  const chosen = await offerCliInstall(io, ui);
  if (chosen === null || !(await installCli(io, ui, chosen))) {
    printSupportedApps(ui);
    return 1;
  }
  const rescanned = filterByRequestedHosts(await detectHosts(io), opts.hosts);
  if (rescanned.length > 0) return rescanned;
  // A fresh global bin is often not on this terminal's PATH yet.
  ui.notice("안내", [cliInstalledRetry(chosen.displayName)]);
  return 0;
}

function presentPlan(
  ui: Ui,
  hosts: readonly DetectedHost[],
  withCatalog: boolean,
): void {
  ui.text(foundPrograms(hosts.length));
  ui.blank();
  ui.table(
    hosts.map(
      (host) => [host.displayName, methodOf(host, withCatalog)] as const,
    ),
  );
  ui.blank();
  if (!withCatalog) {
    ui.text(ONE_SURFACE);
    ui.blank();
    return;
  }
  ui.text(TWO_SURFACES);
  ui.bullets([
    [SURFACE.extension, SURFACE_NOTE.extension],
    [SURFACE.catalog, SURFACE_NOTE.catalog],
  ]);
  ui.blank();
}

function methodOf(host: DetectedHost, withCatalog: boolean): string {
  const catalogAuto = !withCatalog || catalogCommand(host.id) !== null;
  return host.tier !== 3 && catalogAuto ? METHOD_AUTO : METHOD_MANUAL;
}

async function connect(
  opts: RunOptions,
  io: Io,
  ui: Ui,
  hosts: readonly DetectedHost[],
  entryOpts: ServerEntryOptions,
  withCatalog: boolean,
): Promise<HostReport[]> {
  const notices: Notice[] = [];
  const verbose = opts.verbose === true;
  // npm's own output is shown only on request; a failure is reported by the
  // fallback notice, and a raw EACCES dump would bury the step it belongs to.
  const installed = await installGlobally(io, entryOpts.version, {
    inheritStdio: verbose,
  });
  const launchOpts = installed.ok
    ? { ...entryOpts, launch: installed.launch }
    : entryOpts;
  if (!installed.ok) {
    notices.push({
      status: "안내",
      lines: GLOBAL_INSTALL_FALLBACK[installed.reason],
    });
  }

  const reports: HostReport[] = [];
  for (const host of hosts) {
    const outcomes: Outcome[] = [
      await installExtension({ io, opts: launchOpts, verbose }, host),
    ];
    if (withCatalog) {
      outcomes.push(await installCatalog({ io, verbose, link: ui.link }, host));
    }
    reports.push(hostReport(host, outcomes));
  }

  // A connector already running keeps the credential and version it started
  // with, which the configs just written may not share. Cleared here.
  const reclaimed = await reclaimPort(io, entryOpts.token, {
    version: entryOpts.version,
    ...(entryOpts.port === undefined ? {} : { port: entryOpts.port }),
  });
  const reclaimNotice = RECLAIM_NOTICE[reclaimed.kind];
  if (reclaimNotice !== undefined) notices.push(reclaimNotice);

  if (withCatalog) {
    const legacy = await cleanupLegacySkills(
      io,
      new Set(hosts.map((host) => host.id)),
    );
    if (legacy.removed > 0) {
      notices.push({
        status: "정리",
        lines: legacySkillsCleaned(legacy.removed),
      });
    }
  }

  for (const notice of notices) ui.notice(notice.status, notice.lines);
  if (notices.length > 0) ui.blank();
  return reports;
}

interface Notice {
  readonly status: Status;
  readonly lines: readonly string[];
}

const RECLAIM_NOTICE: Readonly<Partial<Record<string, Notice>>> = {
  retired: { status: "정리", lines: RECLAIM.retired },
  forced: { status: "정리", lines: RECLAIM.retired },
  foreign: { status: "안내", lines: RECLAIM.foreign },
  // The entries are written either way; only the moment the new version runs waits.
  failed: { status: "안내", lines: RECLAIM.failed },
};

function printSummary(ui: Ui, counts: Tally): void {
  if (counts.failed > 0) {
    ui.summary("failed", summaryWithFailures(counts.connected, counts.failed));
    return;
  }
  if (counts.manual > 0) {
    ui.summary("partial", summaryWithManual(counts.connected, counts.manual));
    return;
  }
  ui.summary("ok", summaryAllConnected(counts.connected));
}

function finish(
  ui: Ui,
  reports: readonly HostReport[],
  pairs: boolean,
): number {
  const counts = tally(reports);
  printSummary(ui, counts);

  if (counts.connected > 0) {
    const catalogConnected = reports.some((report) =>
      report.rows.some(
        (row) => row.label === SURFACE.catalog && row.status === "완료",
      ),
    );
    const groups = [RESTART_LINES];
    if (pairs) groups.push(PAIRING_LINES);
    if (catalogConnected) groups.push(CATALOG_LOGIN_LINES);
    ui.card("attention", MUST_DO_TITLE, numbered(groups));
  }
  printCards(ui, reports);
  return counts.failed > 0 ? 1 : 0;
}

function numbered(groups: readonly (readonly string[])[]): string[] {
  return groups.flatMap((group, index) => [
    `${String(index + 1)}. ${group[0] ?? ""}`,
    ...group.slice(1),
  ]);
}
