/**
 * Writes the connector's private state files so only the local user can read
 * them: mode 0600 on POSIX, an ACL of the user alone on Windows.
 */
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { restrictToOwner, type RunIcacls } from "./windows-acl.js";

export {
  currentAccount,
  ownerOnlyArgs,
  restrictToOwner,
  type RunIcacls,
} from "./windows-acl.js";

const OWNER_ONLY = 0o600;

export interface OwnerFileDeps {
  platform?: NodeJS.Platform;
  runIcacls?: RunIcacls;
}

/** Throws when the file cannot be written; narrowing access is best-effort. */
export function writeOwnerOnly(
  path: string,
  body: string,
  deps: OwnerFileDeps = {},
): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, { encoding: "utf8", mode: OWNER_ONLY });
  if ((deps.platform ?? process.platform) === "win32") {
    restrictToOwner(path, deps.runIcacls);
    return;
  }
  try {
    chmodSync(path, OWNER_ONLY);
  } catch {
    // A filesystem that refuses chmod keeps the creation mode.
  }
}
