/**
 * Placing the bundled skills, per detected host.
 *
 * The payload ships in the package — nothing is fetched. If the directory is
 * missing the run says so and places nothing, rather than reaching out.
 */
import { join as joinNative } from "node:path";
import { fileURLToPath } from "node:url";

import { SKILL_HOSTS } from "./hosts.js";
import { printBody, printItem } from "./banner.js";
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
    const skillText = await io.readFile(skillMd);
    files.set("SKILL.md", skillText);
    const refs = join(io, root, slug, "references");
    if (await io.exists(refs)) {
      for (const name of await io.listDir(refs)) {
        files.set(
          `references/${name}`,
          await io.readFile(join(io, refs, name)),
        );
      }
    }
    const declared = /^\s+install:\s*([^\s]+)\s*$/m.exec(skillText)?.[1];
    const install =
      declared === "optional"
        ? "optional"
        : declared === undefined || declared === "default"
          ? "default"
          : "optional";
    out.push({ slug, install, files });
  }
  return out;
}

export interface SkillSelectionPlan {
  readonly selected: ReadonlySet<string>;
  readonly defaultCount: number;
  readonly optionalCount: number;
  readonly total: number;
}

function descriptionOf(skillMd: string): string {
  const block = /^---\n([\s\S]*?)\n---/.exec(skillMd)?.[1] ?? "";
  const raw = /^description:\s*(.+)$/m.exec(block)?.[1]?.trim() ?? "";
  return raw.split(/(?<=[.。])\s|(?<=다)\.\s/)[0] ?? raw;
}

function parseSkillSelection(
  answer: string,
  optional: readonly SkillPayload[],
): ReadonlySet<string> | null {
  const value = answer.trim();
  if (value === "") return new Set();
  if (["a", "all", "전체"].includes(value.toLowerCase())) {
    return new Set(optional.map((payload) => payload.slug));
  }
  const selected = new Set<string>();
  for (const token of value.split(/[,\s]+/).filter(Boolean)) {
    const number = Number(token);
    const byNumber = Number.isInteger(number)
      ? optional[number - 1]
      : undefined;
    const bySlug = optional.find((payload) => payload.slug === token);
    const payload = byNumber ?? bySlug;
    if (!payload) return null;
    selected.add(payload.slug);
  }
  return selected;
}

export async function chooseSkillSelection(
  io: Io,
  staged: readonly SkillPayload[],
  options: {
    all?: boolean;
    requested?: readonly string[];
    interactive?: boolean;
  } = {},
): Promise<SkillSelectionPlan | null> {
  const defaults = staged.filter((payload) => payload.install === "default");
  const optional = staged.filter((payload) => payload.install === "optional");
  let selected: ReadonlySet<string> = new Set();

  if (options.all === true) {
    selected = new Set(optional.map((payload) => payload.slug));
  } else if ((options.requested?.length ?? 0) > 0) {
    const known = new Set(staged.map((payload) => payload.slug));
    const unknown = [...new Set(options.requested)].filter(
      (slug) => !known.has(slug),
    );
    if (unknown.length > 0) {
      io.out(`선택할 수 없는 스킬: ${unknown.join(", ")}`);
      return null;
    }
    selected = new Set(
      options.requested?.filter((slug) =>
        optional.some((payload) => payload.slug === slug),
      ),
    );
  } else if (options.interactive === true && optional.length > 0) {
    printBody(
      (line) => io.out(line),
      `추천 스킬 ${defaults.length}개는 기본으로 설치해요.`,
    );
    printBody((line) => io.out(line), "필요한 추가 스킬을 골라 주세요.");
    optional.forEach((payload, index) => {
      const description = descriptionOf(payload.files.get("SKILL.md") ?? "");
      printItem(
        (line) => io.out(line),
        `${index + 1}. ${payload.slug}`,
        description,
      );
    });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const answer = await io.prompt(
        "  추가할 번호를 입력해 주세요 (예: 1,3 / all = 전체 / Enter = 건너뛰기):",
      );
      const parsed = parseSkillSelection(answer, optional);
      if (parsed !== null) {
        selected = parsed;
        break;
      }
      io.out("  번호나 스킬 이름을 목록에 맞게 다시 입력해 주세요.");
      if (attempt === 1) return null;
    }
  }

  return {
    selected,
    defaultCount: defaults.length,
    optionalCount: optional.length,
    total: defaults.length + selected.size,
  };
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
  selection: boolean | ReadonlySet<string> = false,
): Promise<HostResult[]> {
  const results: HostResult[] = [];
  const staged = await readPayloads(io, payloadRoot);
  if (staged === null || staged.length === 0) {
    return results;
  }
  const payloads =
    selection === true
      ? staged
      : staged.filter(
          (payload) =>
            payload.install === "default" ||
            (selection instanceof Set && selection.has(payload.slug)),
        );
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
