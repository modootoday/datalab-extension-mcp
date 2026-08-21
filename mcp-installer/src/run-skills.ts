/**
 * Placing the bundled skills, per detected host.
 *
 * The payload ships in the package — nothing is fetched. If the directory is
 * missing the run says so and places nothing, rather than reaching out.
 */
import { join as joinNative } from "node:path";
import { fileURLToPath } from "node:url";

import { SKILL_HOSTS } from "./hosts.js";
import type { HostResult, Io } from "./types.js";
import {
  installSkillDir,
  removeSkillDir,
  type SkillPayload,
} from "./write-dir.js";

/** Where `copy-skills.mjs` staged the tree, relative to this package's dist. */
const PAYLOAD_DIR = "skills";

/**
 * The staged payload's absolute path.
 *
 * Resolved from this module's own location, not from `cwd` — the installer
 * is spawned by `npx` from wherever the user happens to be standing, and a
 * cwd-relative lookup would find nothing there and silently place no skills.
 *
 * Not on `Io`: this asks where our own code lives, which no injected
 * filesystem can answer and no test needs to fake — tests pass a root directly.
 */
export function skillsPayloadRoot(): string {
  const here = fileURLToPath(new URL(".", import.meta.url));
  return joinNative(here, "..", PAYLOAD_DIR);
}

function join(io: Io, ...parts: string[]): string {
  return io.platform === "win32" ? parts.join("\\") : parts.join("/");
}

/**
 * Read the staged payload.
 *
 * Only `SKILL.md` and `references/*` — the same two entries the staging step
 * copies. Reading whatever happens to be there would ship an authoring artifact
 * into a user's home directory the day one appears.
 */
export async function readPayloads(
  io: Io,
  root: string,
): Promise<SkillPayload[] | null> {
  if (!(await io.exists(root))) {
    return null;
  }
  const out: SkillPayload[] = [];
  for (const slug of await io.listDir(root)) {
    const files = new Map<string, string>();
    const skillMd = join(io, root, slug, "SKILL.md");
    if (!(await io.exists(skillMd))) {
      continue;
    }
    files.set("SKILL.md", await io.readFile(skillMd));
    const refs = join(io, root, slug, "references");
    if (await io.exists(refs)) {
      for (const name of await io.listDir(refs)) {
        files.set(
          `references/${name}`,
          await io.readFile(join(io, refs, name)),
        );
      }
    }
    out.push({ slug, files });
  }
  return out;
}

/**
 * Held back from the default install, and why.
 *
 * A host lists every installed skill on every turn at a measured ~184 tokens
 * each, against a budget of roughly eleven. Twelve is already over, so the
 * default has to be a subset — and the subset that costs nothing to omit is
 * the one that cannot run where it was placed: two refuse to start unless an
 * editor is already open in the browser, and the third names only a tool the
 * MCP surface does not expose. `skills attach <slug>` takes any of them.
 */
const CONDITIONAL: ReadonlyMap<string, string> = new Map([
  ["datalab-card-news", "사진 편집기 캔버스가 열려 있어야 시작해요"],
  ["datalab-video-script", "영상 편집기 타임라인이 열려 있어야 시작해요"],
  ["datalab-photo-prompt", "AI 사진 생성은 확장 패널에서만 돼요"],
]);

/** The slugs held back, so a caller can name them without importing the map. */
export function conditionalSlugs(): readonly string[] {
  return [...CONDITIONAL.keys()];
}

const REFUSAL_MESSAGE: Record<string, string> = {
  unmarked: "다른 도구가 만든 폴더가 있어 건드리지 않았어요.",
  foreign: "다른 도구가 설치한 스킬이 있어 그대로 뒀어요.",
  unreadable: "설치 표식을 읽을 수 없어 건드리지 않았어요.",
};

/**
 * Place every bundled skill into every detected host that reads them.
 *
 * `detectedIds` are the hosts this run already configured — skills follow the
 * same detection, so a host the user does not have is never written to.
 */
export async function placeSkills(
  io: Io,
  payloadRoot: string,
  detectedIds: ReadonlySet<string>,
  version: string,
  all = false,
): Promise<HostResult[]> {
  const results: HostResult[] = [];
  const staged = await readPayloads(io, payloadRoot);
  if (staged === null || staged.length === 0) {
    return results;
  }
  const payloads = all
    ? staged
    : staged.filter((p) => !CONDITIONAL.has(p.slug));
  const held = staged.length - payloads.length;

  for (const host of SKILL_HOSTS) {
    if (!detectedIds.has(host.id)) {
      continue;
    }
    if (host.skills.tier === 3) {
      results.push({
        hostId: host.id,
        displayName: host.displayName,
        tier: 3,
        status: "skipped",
        surface: "skills",
        message: `${host.skills.reason} ${host.skills.instruction}`,
      });
      continue;
    }
    const dir = host.skills.skillsDir(io);
    if (dir === null) {
      continue;
    }
    const refused: string[] = [];
    let placed = 0;
    for (const payload of payloads) {
      const out = await installSkillDir(io, dir, payload, version);
      if (out.ok) {
        placed += 1;
      } else {
        refused.push(`${payload.slug}: ${REFUSAL_MESSAGE[out.refusal ?? ""]}`);
      }
    }
    // The held-back count is said out loud. Silence would read as "twelve
    // shipped, nine arrived" and look like a partial failure.
    // Named, not instructed: `skills list` is a command this reader cannot
    // run — they got here by pasting one line — and it repeated on every host.
    const heldNote = held > 0 ? ` (조건부 ${held}개 제외)` : "";
    results.push({
      hostId: host.id,
      displayName: host.displayName,
      tier: 2,
      status: placed > 0 ? "success" : "skipped",
      surface: "skills",
      message:
        refused.length > 0
          ? `스킬 ${placed}개를 설치했어요. ${refused.join(" ")}${heldNote}`
          : `스킬 ${placed}개를 설치했어요.${heldNote}`,
    });
  }
  return results;
}

/**
 * Slugs this build ships — the only ones uninstall may consider.
 *
 * Not "everything in the host's directory". A slug we never shipped is
 * someone else's, and the marker would refuse it anyway; reading the payload
 * means we never even ask.
 */
export async function stagedSlugs(
  io: Io,
  root: string,
): Promise<readonly string[]> {
  const payloads = await readPayloads(io, root);
  return payloads === null ? [] : payloads.map((p) => p.slug);
}

/** Remove only the skills we placed. Refusals are reported, never forced. */
export async function removeSkills(
  io: Io,
  detectedIds: ReadonlySet<string>,
  slugs: readonly string[],
): Promise<HostResult[]> {
  const results: HostResult[] = [];
  for (const host of SKILL_HOSTS) {
    if (!detectedIds.has(host.id) || host.skills.tier !== 2) {
      continue;
    }
    const dir = host.skills.skillsDir(io);
    if (dir === null) {
      continue;
    }
    let removed = 0;
    const kept: string[] = [];
    for (const slug of slugs) {
      const out = await removeSkillDir(io, dir, slug);
      if (out.ok) {
        removed += out.files.length > 0 ? 1 : 0;
      } else {
        kept.push(slug);
      }
    }
    results.push({
      hostId: host.id,
      displayName: host.displayName,
      tier: 2,
      status: "success",
      surface: "skills",
      message:
        kept.length > 0
          ? `스킬 ${removed}개를 제거했어요. ${kept.length}개는 우리가 설치한 것이 아니라 그대로 뒀어요.`
          : `스킬 ${removed}개를 제거했어요.`,
    });
  }
  return results;
}

export { PAYLOAD_DIR };
