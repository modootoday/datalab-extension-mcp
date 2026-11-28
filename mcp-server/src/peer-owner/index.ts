/** The OS account behind a loopback peer: only this user's programs are served. */
export {
  WINDOWS_ACCOUNT_TTL_MS,
  createPeerOwnerCheck,
  systemPeerOwnerDeps,
  type PeerOwnerDeps,
  type RunResult,
} from "./lookup.js";
export type { PeerOwnerCheck, PeerVerdict } from "./verdict.js";
