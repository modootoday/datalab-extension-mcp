/**
 * The skills directory shared by nine vendors.
 *
 * A cross-client convention rather than one vendor's path: nine descriptors
 * resolve through this helper, so if the convention moves it moves once here
 * instead of drifting across nine hand-rolled copies of the same segments.
 */
import { resolveHostPath, type PathIo } from "./paths.js";

export function agentsSkillsDir(io: PathIo): string | null {
  return resolveHostPath(io, { kind: "home", segments: [".agents", "skills"] });
}
