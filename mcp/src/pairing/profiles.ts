/**
 * The list and unpair-one commands: show the paired browser profiles, and
 * forget one of them by its number or name while the others stay paired.
 */
import type { StopOutcome } from "./unpair.js";

export interface PairedProfile {
  readonly digest: string;
  readonly pairedAt: string;
  readonly label?: string;
}

export type ProfilesView =
  | { kind: "ready"; profiles: readonly PairedProfile[] }
  | { kind: "absent" }
  | { kind: "corrupt" };

export type ProfilePick =
  | { kind: "one"; profile: PairedProfile }
  | { kind: "none" }
  | { kind: "ambiguous"; numbers: number[] };

const NO_NAME = "(이름 없음)";

function nameOf(profile: PairedProfile): string {
  return profile.label ?? NO_NAME;
}

function lineFor(profile: PairedProfile, index: number): string {
  return `${String(index + 1)}. ${nameOf(profile)} · ${profile.pairedAt.slice(0, 10)} 연결`;
}

/** A number is the list's position; anything else must be exactly one name. */
export function pickProfile(
  profiles: readonly PairedProfile[],
  target: string,
): ProfilePick {
  if (/^[1-9][0-9]*$/.test(target)) {
    const profile = profiles[Number(target) - 1];
    return profile === undefined ? { kind: "none" } : { kind: "one", profile };
  }
  const numbers = profiles
    .map((profile, index) => (profile.label === target ? index + 1 : 0))
    .filter((n) => n > 0);
  const [only] = numbers;
  if (numbers.length > 1) return { kind: "ambiguous", numbers };
  if (only === undefined) return { kind: "none" };
  const profile = profiles[only - 1];
  return profile === undefined ? { kind: "none" } : { kind: "one", profile };
}

export interface ListDeps {
  read: () => ProfilesView;
  print: (line: string) => void;
}

export function runList(deps: ListDeps): number {
  const view = deps.read();
  if (view.kind === "corrupt") {
    deps.print(
      "페어링 기록을 읽지 못했어요. unpair 로 모두 해제한 뒤 다시 연결해 주세요.",
    );
    return 1;
  }
  if (view.kind === "absent" || view.profiles.length === 0) {
    deps.print("이 컴퓨터에 연결된 브라우저 프로필이 없어요.");
    return 0;
  }
  view.profiles.forEach((profile, index) => {
    deps.print(lineFor(profile, index));
  });
  deps.print("하나만 해제하려면 unpair <번호 또는 이름> 을 실행해 주세요.");
  return 0;
}

export interface UnpairOneDeps {
  target: string;
  read: () => ProfilesView;
  /** Forget this profile on disk; true once the record agrees. */
  revoke: (digest: string) => boolean;
  stopDaemon: () => Promise<StopOutcome>;
  print: (line: string) => void;
}

export async function runUnpairOne(deps: UnpairOneDeps): Promise<number> {
  const view = deps.read();
  if (view.kind !== "ready") {
    deps.print(
      "해제할 브라우저 프로필을 찾지 못했어요. list 로 목록을 확인해 주세요.",
    );
    return 1;
  }
  const pick = pickProfile(view.profiles, deps.target);
  if (pick.kind === "ambiguous") {
    deps.print("같은 이름의 프로필이 여러 개예요. 번호로 골라 주세요.");
    for (const n of pick.numbers) {
      const profile = view.profiles[n - 1];
      if (profile !== undefined) deps.print(lineFor(profile, n - 1));
    }
    return 1;
  }
  if (pick.kind === "none") {
    deps.print("그런 프로필이 없어요. list 로 목록을 확인해 주세요.");
    return 1;
  }
  // Stopped first, or the running connector would keep serving the profile
  // from memory and write it back.
  const stop = await deps.stopDaemon();
  if (stop === "refused") {
    deps.print(
      "커넥터가 아직 실행 중이라 해제하지 못했어요. 아무것도 바뀌지 않았어요.",
    );
    deps.print("이 컴퓨터의 AI 앱을 모두 종료한 뒤 다시 실행해 주세요.");
    return 1;
  }
  if (!deps.revoke(pick.profile.digest)) {
    deps.print(
      "기록을 저장하지 못해 해제되지 않았어요. 잠시 뒤 다시 실행해 주세요.",
    );
    return 1;
  }
  deps.print(
    `${nameOf(pick.profile)} 프로필을 해제했어요. 다른 프로필은 그대로예요.`,
  );
  deps.print(
    "그 프로필에서 다시 쓰려면 사이드패널의 연결 설정에서 새로 연결해 주세요.",
  );
  return 0;
}
