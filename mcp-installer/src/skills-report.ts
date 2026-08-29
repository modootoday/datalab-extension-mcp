/**
 * Answering what we ship and what is on this machine, and moving one skill at
 * a time.
 *
 * Reuses the payload reader and the marker inspector rather than re-deriving
 * either: a report that disagreed with the writer about what counts as ours
 * would be worse than no report.
 */
import { SKILL_HOSTS } from "./hosts.js";
import { detectHosts } from "./run.js";
import { readPayloads } from "./run-skills.js";
import type { Io } from "./types.js";
import {
  inspectSkillDir,
  installSkillDir,
  removeSkillDir,
  type DirRefusal,
} from "./write-dir.js";

export interface SkillSummary {
  readonly slug: string;
  /** Empty when the file carries no description — never invented. */
  readonly description: string;
}

export interface SkillDirState {
  readonly dir: string;
  /** Display names of every vendor that reads this one directory. */
  readonly hosts: readonly string[];
  readonly ours: readonly { slug: string; version: string }[];
  readonly refused: readonly { slug: string; refusal: DirRefusal }[];
  /** Shipped in this build, not present here. */
  readonly absent: readonly string[];
}

export interface SkillStatus {
  readonly dirs: readonly SkillDirState[];
  /** Vendors that do not read skills at all, and why. */
  readonly unsupported: readonly { host: string; reason: string }[];
}

/**
 * The `description:` line of a SKILL.md.
 *
 * Top-level keys only, single line — which is the shape the publish gate
 * enforces, so a multi-line description cannot reach a published tree.
 */
function descriptionOf(skillMd: string): string {
  const fm = /^---\n([\s\S]*?)\n---/.exec(skillMd);
  const line = /^description:\s*(.*)$/m.exec(fm?.[1] ?? "");
  return (line?.[1] ?? "").trim();
}

/** What this build ships, in payload order. */
export async function listSkills(
  io: Io,
  payloadRoot: string,
): Promise<readonly SkillSummary[]> {
  const payloads = await readPayloads(io, payloadRoot);
  if (payloads === null) return [];
  return payloads.map((p) => ({
    slug: p.slug,
    description: descriptionOf(p.files.get("SKILL.md") ?? ""),
  }));
}

/**
 * What is on this machine.
 *
 * Grouped by directory, not by vendor: nine of the rows resolve to the same
 * path, and reporting them separately would show one installation nine times
 * and invite a user to "fix" eight of them.
 */
export async function skillStatus(
  io: Io,
  payloadRoot: string,
): Promise<SkillStatus> {
  const shipped = (await listSkills(io, payloadRoot)).map((s) => s.slug);
  const byDir = new Map<string, string[]>();
  const unsupported: { host: string; reason: string }[] = [];

  for (const host of SKILL_HOSTS) {
    if (host.skills.tier === 3) {
      unsupported.push({ host: host.displayName, reason: host.skills.reason });
      continue;
    }
    const dir = host.skills.skillsDir(io);
    if (dir === null) continue;
    byDir.set(dir, [...(byDir.get(dir) ?? []), host.displayName]);
  }

  const dirs: SkillDirState[] = [];
  for (const [dir, hosts] of byDir) {
    const ours: { slug: string; version: string }[] = [];
    const refused: { slug: string; refusal: DirRefusal }[] = [];
    const absent: string[] = [];
    for (const slug of shipped) {
      const state = await inspectSkillDir(io, dir, slug);
      if (state.kind === "ours") ours.push({ slug, version: state.version });
      else if (state.kind === "refused")
        refused.push({ slug, refusal: state.refusal });
      else absent.push(slug);
    }
    dirs.push({ dir, hosts, ours, refused, absent });
  }
  return { dirs, unsupported };
}

export interface MoveOutcome {
  readonly dir: string;
  readonly hosts: readonly string[];
  /** Absent on success; the reason the directory was left alone otherwise. */
  readonly refusal?: DirRefusal;
}

export type MoveResult =
  | { readonly kind: "unknown-slug"; readonly shipped: readonly string[] }
  | { readonly kind: "moved"; readonly outcomes: readonly MoveOutcome[] };

/**
 * Where a move may write, each directory named once.
 *
 * Gated on the same detection `install` uses, not on the host table alone: a
 * skill attached into `~/.kiro/skills` on a machine with no Kiro would create
 * the app's directory as a side effect of a command about skills.
 */
async function targetDirs(io: Io): Promise<Map<string, string[]>> {
  const detected = new Set((await detectHosts(io)).map((d) => d.id));
  const byDir = new Map<string, string[]>();
  for (const host of SKILL_HOSTS) {
    if (host.skills.tier !== 2 || !detected.has(host.id)) continue;
    const dir = host.skills.skillsDir(io);
    if (dir === null) continue;
    byDir.set(dir, [...(byDir.get(dir) ?? []), host.displayName]);
  }
  return byDir;
}

/**
 * Place one skill everywhere skills go.
 *
 * A slug we do not ship is refused by name rather than attempted — the marker
 * would decline it anyway, and a typo deserves the list, not a silent no-op.
 */
export async function attachSkill(
  io: Io,
  payloadRoot: string,
  slug: string,
  version: string,
): Promise<MoveResult> {
  const payloads = (await readPayloads(io, payloadRoot)) ?? [];
  const payload = payloads.find((p) => p.slug === slug);
  if (payload === undefined) {
    return { kind: "unknown-slug", shipped: payloads.map((p) => p.slug) };
  }
  const outcomes: MoveOutcome[] = [];
  for (const [dir, hosts] of await targetDirs(io)) {
    const out = await installSkillDir(io, dir, payload, version);
    outcomes.push(
      out.ok ? { dir, hosts } : { dir, hosts, refusal: out.refusal },
    );
  }
  return { kind: "moved", outcomes };
}

/**
 * Take one skill back out.
 *
 * Same slug check as attach, for the same reason and one more: removal reads
 * the marker, and asking about a slug we never shipped would mean walking
 * directories we have no business in.
 */
export async function detachSkill(
  io: Io,
  payloadRoot: string,
  slug: string,
): Promise<MoveResult> {
  const shipped = (await listSkills(io, payloadRoot)).map((s) => s.slug);
  if (!shipped.includes(slug)) {
    return { kind: "unknown-slug", shipped };
  }
  const outcomes: MoveOutcome[] = [];
  for (const [dir, hosts] of await targetDirs(io)) {
    const out = await removeSkillDir(io, dir, slug);
    outcomes.push(
      out.ok ? { dir, hosts } : { dir, hosts, refusal: out.refusal },
    );
  }
  return { kind: "moved", outcomes };
}
