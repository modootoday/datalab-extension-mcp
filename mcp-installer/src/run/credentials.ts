/**
 * Step one: the connection key. A key already passed goes straight through; a
 * missing one is asked for when a person is at the keyboard, and explained
 * with the next action when stdin is a pipe.
 */
import { DEFAULT_EXTENSION_ID } from "../hosts.js";
import {
  TOKEN_PROMPT_GUIDE,
  TOKEN_PROMPT_QUESTION,
  TOKEN_PROMPT_RETRY,
  TOKEN_REQUIRED,
  TOKEN_REQUIRED_CARD,
} from "../strings.js";
import type { Io, RunOptions } from "../types.js";
import type { Ui } from "../ui.js";
import { TOKEN_RE } from "../validate.js";

/** Null means the person has been told what to do and the run should end. */
export async function resolveCredentials(
  opts: RunOptions,
  io: Io,
  ui: Ui,
): Promise<RunOptions | null> {
  if (typeof opts.token === "string" && opts.token !== "") return opts;

  if (!io.isInteractive()) {
    ui.notice("실패", [TOKEN_REQUIRED]);
    ui.card("attention", TOKEN_REQUIRED_CARD.title, TOKEN_REQUIRED_CARD.lines);
    return null;
  }

  for (const line of TOKEN_PROMPT_GUIDE) ui.text(line);
  ui.blank();
  const extensionId = opts.extensionId ?? DEFAULT_EXTENSION_ID;
  // One retry: a first paste that picks up a trailing space or half a
  // selection is common, and asking again beats a hard failure.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const entered = await io.prompt(TOKEN_PROMPT_QUESTION);
    if (TOKEN_RE.test(entered)) return { ...opts, token: entered, extensionId };
    if (attempt === 0) ui.notice("안내", [TOKEN_PROMPT_RETRY]);
  }
  // A second bad paste falls through to validation, which prints the standard
  // refusal, keeping the exit path in one place.
  return { ...opts, extensionId };
}
