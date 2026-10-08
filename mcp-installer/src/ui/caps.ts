/**
 * What the terminal can show, and how wide a string is in it. Decided once per
 * run from the environment, so the drawing code never asks.
 */
import type { Io } from "../types.js";

export interface TerminalCaps {
  readonly color: boolean;
  readonly unicode: boolean;
}

/** One line holds at most this many columns, a Korean syllable counting two. */
export const LINE_WIDTH = 56;

export function terminalCaps(
  io: Pick<Io, "platform" | "env" | "stdoutIsTTY">,
): TerminalCaps {
  const env = io.env;
  const forced = env["FORCE_COLOR"] !== undefined && env["FORCE_COLOR"] !== "0";
  const tty =
    io.stdoutIsTTY === true &&
    env["NO_COLOR"] === undefined &&
    env["TERM"] !== "dumb";
  // The legacy Windows console draws box characters in the wrong width or not
  // at all; Windows Terminal and editor terminals announce themselves.
  const unicode =
    io.platform !== "win32" ||
    env["WT_SESSION"] !== undefined ||
    env["TERM_PROGRAM"] !== undefined;
  return { color: forced || tty, unicode };
}

/** Columns a string takes in a terminal: Hangul and other wide forms count two. */
export function displayWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    width += isWide(char.codePointAt(0) ?? 0) ? 2 : 1;
  }
  return width;
}

export function padEnd(text: string, width: number): string {
  return text + " ".repeat(Math.max(0, width - displayWidth(text)));
}

const WIDE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x1100, 0x115f],
  [0x2e80, 0xa4cf],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe30, 0xfe4f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
];

function isWide(code: number): boolean {
  return WIDE_RANGES.some(([from, to]) => code >= from && code <= to);
}
