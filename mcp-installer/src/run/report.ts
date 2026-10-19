/**
 * What one run did to each program, as rows under its name plus any card the
 * person has to act on. Install and uninstall build these; only this module
 * turns them into lines.
 */
import type { CardTone, Status, Ui } from "../ui.js";

export interface Row {
  readonly status: Status;
  readonly label: string;
  readonly detail?: string;
}

export interface Card {
  readonly tone: CardTone;
  readonly title: string;
  readonly lines: readonly string[];
}

/** One surface's outcome on one program. */
export interface Outcome {
  readonly row: Row;
  readonly card?: Card;
}

export interface HostReport {
  readonly hostId: string;
  readonly displayName: string;
  readonly rows: readonly Row[];
  readonly cards: readonly Card[];
}

export function hostReport(
  host: { readonly id: string; readonly displayName: string },
  outcomes: readonly Outcome[],
): HostReport {
  const cards: Card[] = [];
  for (const outcome of outcomes) {
    if (outcome.card !== undefined) cards.push(outcome.card);
  }
  return {
    hostId: host.id,
    displayName: host.displayName,
    rows: outcomes.map((outcome) => outcome.row),
    cards,
  };
}

export function printHostReports(ui: Ui, reports: readonly HostReport[]): void {
  reports.forEach((report, i) => {
    if (i > 0) ui.blank();
    ui.host(report.displayName);
    for (const row of report.rows) {
      ui.status(row.status, row.label, row.detail);
    }
  });
}

export function printCards(ui: Ui, reports: readonly HostReport[]): void {
  for (const report of reports) {
    for (const card of report.cards) {
      ui.card(card.tone, card.title, card.lines);
    }
  }
}

export interface Tally {
  /** Programs with at least one surface connected. */
  readonly connected: number;
  readonly manual: number;
  readonly failed: number;
}

export function tally(reports: readonly HostReport[]): Tally {
  let connected = 0;
  let manual = 0;
  let failed = 0;
  for (const report of reports) {
    if (report.rows.some((row) => row.status === "완료")) connected += 1;
    manual += report.rows.filter((row) => row.status === "직접").length;
    failed += report.rows.some((row) => row.status === "실패") ? 1 : 0;
  }
  return { connected, manual, failed };
}
