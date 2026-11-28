/** Forgets every pairing on this machine: the profile record and the older single record. */
import { homedir } from "node:os";

import { deleteProfiles } from "./profiles/index.js";
import { deletePairingRecord } from "./record.js";

/** Returns whether anything was paired. */
export function forgetAllPairings(home: string = homedir()): boolean {
  const legacy = deletePairingRecord(home);
  const profiles = deleteProfiles(home);
  return legacy || profiles;
}
