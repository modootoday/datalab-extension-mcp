/**
 * `skills` — what we ship, and what is on this machine.
 *
 * Read-only, both actions. Formatting only; the installer answers the two
 * questions and this file decides how a person reads the answer.
 */
import type {
  MoveResult,
  SkillDirState,
  SkillStatus,
  SkillSummary,
} from "@modootoday/extension-app-mcp-installer";

export const USAGE = "사용법: skills [list|status|attach <slug>|detach <slug>]";

const REFUSAL_TEXT: Record<string, string> = {
  unmarked: "다른 도구가 만든 폴더",
  foreign: "다른 도구가 설치한 스킬",
  unreadable: "표식을 읽을 수 없음",
};

export interface SkillsDeps {
  out: (line: string) => void;
  list: () => Promise<readonly SkillSummary[]>;
  status: () => Promise<SkillStatus>;
  attach: (slug: string) => Promise<MoveResult>;
  detach: (slug: string) => Promise<MoveResult>;
}

function renderList(skills: readonly SkillSummary[]): string[] {
  if (skills.length === 0) {
    return ["이 빌드에는 스킬이 들어 있지 않아요."];
  }
  const lines = [`스킬 ${skills.length}개`, ""];
  for (const s of skills) {
    lines.push(`  ${s.slug}`);
    if (s.description !== "") lines.push(`    ${s.description}`);
  }
  return lines;
}

function renderDir(d: SkillDirState): string[] {
  const lines = ["", `  ${d.dir}`, `    ${d.hosts.join(" · ")}`];
  if (d.ours.length === 0 && d.refused.length === 0) {
    lines.push("    설치된 스킬 없음");
    return lines;
  }
  // One version line, not one per skill: a mixed set means an interrupted
  // install, and saying so once is what the reader can act on.
  const versions = [...new Set(d.ours.map((o) => o.version))];
  if (d.ours.length > 0) {
    lines.push(`    설치됨 ${d.ours.length}개 · ${versions.join(", ")}`);
  }
  if (d.absent.length > 0) {
    lines.push(`    이 빌드에 있으나 여기 없음 ${d.absent.length}개`);
  }
  for (const r of d.refused) {
    lines.push(`    ${r.slug} — ${REFUSAL_TEXT[r.refusal] ?? r.refusal}`);
  }
  return lines;
}

function renderStatus(status: SkillStatus): string[] {
  const lines: string[] = [];
  if (status.dirs.length === 0) {
    lines.push("스킬을 읽는 앱을 찾지 못했어요.");
  } else {
    lines.push("스킬 상태");
    for (const d of status.dirs) lines.push(...renderDir(d));
  }
  if (status.unsupported.length > 0) {
    lines.push("", "  스킬을 읽지 않는 앱");
    for (const u of status.unsupported) {
      lines.push(`    ${u.host} — ${u.reason}`);
    }
  }
  return lines;
}

function renderMove(slug: string, verb: string, result: MoveResult): string[] {
  if (result.kind === "unknown-slug") {
    return [
      `"${slug}" 은 이 빌드에 없는 스킬이에요.`,
      ...result.shipped.map((s) => `  ${s}`),
    ];
  }
  if (result.outcomes.length === 0) {
    return ["스킬을 읽는 앱을 찾지 못했어요."];
  }
  const lines: string[] = [];
  for (const o of result.outcomes) {
    const where = `${o.dir} (${o.hosts.join(" · ")})`;
    lines.push(
      o.refusal === undefined
        ? `  ${verb} — ${where}`
        : `  건너뜀 — ${where}: ${REFUSAL_TEXT[o.refusal] ?? o.refusal}`,
    );
  }
  return lines;
}

/**
 * Exit code, matching `browsers`: 0 answered, 2 asked for wrongly.
 *
 * A refused directory is not a failed run — it is the ownership rule working,
 * and the line says which one so a person can go look.
 */
export async function runSkills(
  argv: readonly string[],
  deps: SkillsDeps,
): Promise<number> {
  const action = argv[0] ?? "list";
  const slug = argv[1] ?? "";

  if (action === "list") {
    for (const line of renderList(await deps.list())) deps.out(line);
    return 0;
  }
  if (action === "status") {
    for (const line of renderStatus(await deps.status())) deps.out(line);
    return 0;
  }
  if (action === "attach" || action === "detach") {
    if (slug === "") {
      deps.out(`사용법: skills ${action} <slug>`);
      return 2;
    }
    const result =
      action === "attach" ? await deps.attach(slug) : await deps.detach(slug);
    const verb = action === "attach" ? "넣었어요" : "뺐어요";
    for (const line of renderMove(slug, verb, result)) deps.out(line);
    return result.kind === "unknown-slug" ? 2 : 0;
  }

  deps.out(USAGE);
  return 2;
}
