/**
 * Earlier releases copied datalab skills into each program's skill folder; the
 * catalog now serves them. A copy left behind would show the same skill twice,
 * so this removes the ones our marker proves we placed and nothing else.
 */
import { SKILL_HOSTS } from "../hosts.js";
import { removeSkillDir } from "../write-dir.js";
import type { Io } from "../types.js";

/** Every slug the old payload shipped began with this. */
const LEGACY_PREFIX = "datalab-";

export interface LegacyCleanup {
  /** Skill folders removed, counted once even where programs share a folder. */
  readonly removed: number;
  /** Folders with our name that another tool or the person owns; left alone. */
  readonly kept: number;
}

export async function cleanupLegacySkills(
  io: Io,
  detectedIds: ReadonlySet<string>,
): Promise<LegacyCleanup> {
  const dirs = new Set<string>();
  for (const host of SKILL_HOSTS) {
    if (!detectedIds.has(host.id) || host.skills.tier !== 2) {
      continue;
    }
    const dir = host.skills.skillsDir(io);
    if (dir !== null) {
      dirs.add(dir);
    }
  }
  const removed = new Set<string>();
  let kept = 0;
  for (const dir of dirs) {
    for (const slug of await io.listDir(dir)) {
      if (!slug.startsWith(LEGACY_PREFIX)) {
        continue;
      }
      const outcome = await removeSkillDir(io, dir, slug);
      if (outcome.ok && outcome.files.length > 0) {
        removed.add(slug);
      } else if (!outcome.ok) {
        kept += 1;
      }
    }
  }
  return { removed: removed.size, kept };
}
