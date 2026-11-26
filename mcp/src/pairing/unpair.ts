/**
 * The unpair command: forget the side panel this machine's connector paired
 * with, and stop the running connector so the next start accepts a new claim.
 */
export type StopOutcome = "stopped" | "not_running" | "refused";

export interface UnpairDeps {
  /** Remove the pairing record; true when one was there. */
  deleteRecord: () => boolean;
  /** Ask the running connector to stop. */
  stopDaemon: () => Promise<StopOutcome>;
  /** A line for the person at the terminal. */
  print: (line: string) => void;
}

export async function runUnpair(deps: UnpairDeps): Promise<number> {
  // Stopped first: a record removed under a connector that keeps running would
  // read as unpaired while that connector still admits the old panel.
  const stop = await deps.stopDaemon();
  if (stop === "refused") {
    deps.print(
      "커넥터가 아직 실행 중이라 페어링을 해제하지 못했어요. 아무것도 바뀌지 않았어요.",
    );
    deps.print(
      "이 컴퓨터의 AI 앱을 모두 종료한 뒤 이 명령을 다시 실행해 주세요.",
    );
    return 1;
  }
  const removed = deps.deleteRecord();
  if (!removed) {
    deps.print("이 컴퓨터의 커넥터는 페어링된 브라우저가 없어요.");
    return 0;
  }
  deps.print("페어링을 해제했어요.");
  if (stop === "stopped") deps.print("실행 중이던 커넥터도 멈췄어요.");
  deps.print(
    "AI 앱을 다시 시작한 뒤 10분 안에 사이드패널에서 연결하면 새로 페어링돼요.",
  );
  return 0;
}
