/**
 * The drawing primitives every installer line goes through: step rules, host
 * groups, status words, cards and colour. Flow code says what happened and
 * never how it looks.
 */
import { displayWidth, LINE_WIDTH, padEnd, type TerminalCaps } from "./caps.js";

/** Every meaning is carried by the word; colour only speeds up the scan. */
export type Status = "완료" | "직접" | "실패" | "건너뜀" | "안내" | "정리";
export type CardTone = "attention" | "failure" | "info";
export type SummaryTone = "ok" | "partial" | "failed";

const SGR = {
  bold: "1",
  dim: "2",
  red: "31",
  green: "32",
  yellow: "33",
  cyan: "36",
} as const;
type Style = keyof typeof SGR;

const STATUS_STYLE: Readonly<Record<Status, Style>> = {
  완료: "green",
  직접: "yellow",
  안내: "yellow",
  실패: "red",
  건너뜀: "dim",
  정리: "dim",
};

const CARD_STYLE: Readonly<Record<CardTone, Style>> = {
  attention: "yellow",
  failure: "red",
  info: "cyan",
};

const SUMMARY_STYLE: Readonly<Record<SummaryTone, Style>> = {
  ok: "green",
  partial: "yellow",
  failed: "red",
};

export interface Ui {
  banner(title: string, version: string): void;
  step(index: number, total: number, title: string): void;
  blank(): void;
  /** A body line, two columns in. */
  text(line: string): void;
  /** A secondary body line, dimmed. */
  note(line: string): void;
  /** Name and note in two aligned columns, four columns in. */
  table(rows: ReadonlyArray<readonly [string, string]>): void;
  /** Bullet rows under a body line, notes aligned and dimmed. */
  bullets(rows: ReadonlyArray<readonly [string, string]>): void;
  /** A program's name, heading its status rows. */
  host(name: string): void;
  /** A status row under a host, with an optional dimmed detail beneath. */
  status(status: Status, label: string, detail?: string): void;
  /** A status at body level whose text runs over several lines. */
  notice(status: Status, lines: readonly string[]): void;
  card(tone: CardTone, title: string, lines: readonly string[]): void;
  summary(tone: SummaryTone, line: string): void;
  /** The text handed to the yes/no question; Io.ask spells out the keys. */
  question(line: string): string;
  /** An address or command, coloured to stand out inside a line. */
  link(text: string): string;
}

interface Glyphs {
  readonly heavy: string;
  readonly double: string;
  readonly bar: string;
  readonly dot: string;
}

const UNICODE_GLYPHS: Glyphs = { heavy: "━", double: "═", bar: "┃", dot: "·" };
const ASCII_GLYPHS: Glyphs = { heavy: "-", double: "=", bar: "|", dot: "-" };

export function createUi(out: (line: string) => void, caps: TerminalCaps): Ui {
  const paint = (text: string, ...styles: Style[]): string => {
    if (!caps.color || styles.length === 0) return text;
    return `\x1b[${styles.map((s) => SGR[s]).join(";")}m${text}\x1b[0m`;
  };
  const glyphs = caps.unicode ? UNICODE_GLYPHS : ASCII_GLYPHS;
  const indentAfter = (lead: number, status: Status): string =>
    " ".repeat(lead + displayWidth(status) + 2);

  return {
    banner(title, version) {
      const gap = LINE_WIDTH - 2 - displayWidth(title) - displayWidth(version);
      out("");
      out(
        `  ${paint(title, "bold")}${" ".repeat(Math.max(2, gap))}${paint(version, "dim")}`,
      );
      out(`  ${paint(glyphs.double.repeat(LINE_WIDTH - 2), "dim")}`);
    },
    step(index, total, title) {
      const count = `${String(index)}/${String(total)}`;
      const lead = `${glyphs.heavy}${glyphs.heavy} ${count}  ${title} `;
      const fill = glyphs.heavy.repeat(
        Math.max(4, LINE_WIDTH - displayWidth(lead)),
      );
      out("");
      out(
        `${paint(glyphs.heavy.repeat(2), "dim")} ${paint(count, "cyan", "bold")}  ${paint(title, "bold")} ${paint(fill, "dim")}`,
      );
      out("");
    },
    blank() {
      out("");
    },
    text(line) {
      out(`  ${line}`);
    },
    note(line) {
      out(`  ${paint(line, "dim")}`);
    },
    table(rows) {
      const width = Math.max(...rows.map(([name]) => displayWidth(name)));
      for (const [name, note] of rows) {
        out(`    ${paint(padEnd(name, width), "bold")}   ${note}`);
      }
    },
    bullets(rows) {
      const width = Math.max(...rows.map(([label]) => displayWidth(label)));
      for (const [label, note] of rows) {
        out(
          `    ${glyphs.dot} ${padEnd(label, width)}   ${paint(note, "dim")}`,
        );
      }
    },
    host(name) {
      out(`  ${paint(name, "bold")}`);
    },
    status(status, label, detail) {
      out(`    ${paint(status, STATUS_STYLE[status])}  ${label}`);
      if (detail === undefined || detail === "") return;
      out(`${indentAfter(4, status)}${paint(detail, "dim")}`);
    },
    notice(status, lines) {
      lines.forEach((line, i) => {
        if (i === 0) {
          out(`  ${paint(status, STATUS_STYLE[status])}  ${line}`);
          return;
        }
        out(`${indentAfter(2, status)}${line}`);
      });
    },
    card(tone, title, lines) {
      const style = CARD_STYLE[tone];
      const side = paint(glyphs.bar, style);
      out("");
      out(`  ${side} ${paint(title, style, "bold")}`);
      out(`  ${side}`);
      for (const line of lines) {
        out(line === "" ? `  ${side}` : `  ${side} ${line}`);
      }
    },
    summary(tone, line) {
      out(`  ${paint(line, SUMMARY_STYLE[tone])}`);
    },
    question(line) {
      return `  ${paint(line, "bold")}`;
    },
    link(text) {
      return paint(text, "cyan");
    },
  };
}
