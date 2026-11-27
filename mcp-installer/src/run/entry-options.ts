/**
 * What every config entry this run writes will say. No key is asked for: the
 * connector pairs with the side panel, and a key passed on the command line
 * still goes through for setups that run on a fixed token.
 */
import { DEFAULT_EXTENSION_ID, type ServerEntryOptions } from "../hosts.js";
import type { RunOptions } from "../types.js";
import { validateInstallOptions } from "../validate.js";

export type EntryOptionsOutcome =
  | { ok: true; entry: ServerEntryOptions }
  | { ok: false; refusal: string };

export function resolveEntryOptions(opts: RunOptions): EntryOptionsOutcome {
  const token = opts.token === "" ? undefined : opts.token;
  const resolved: RunOptions = {
    ...opts,
    token,
    extensionId: opts.extensionId ?? DEFAULT_EXTENSION_ID,
  };
  // These values reach shell argv and config files, so each is checked first.
  const refusal = validateInstallOptions(resolved);
  if (refusal !== null) return { ok: false, refusal };
  const entry: ServerEntryOptions = {
    version: resolved.version,
    extensionId: resolved.extensionId as string,
  };
  if (token !== undefined) entry.token = token;
  if (resolved.port !== undefined) entry.port = resolved.port;
  return { ok: true, entry };
}
