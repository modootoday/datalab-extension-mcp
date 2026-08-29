/**
 * Connection state and reconnect policy — pure.
 *
 * The server is a process the user starts and stops at will, so "not running"
 * is the normal state rather than a fault. This is polling for a peer that may
 * not exist yet, not recovery: no error toast, no give-up, and a backoff that
 * stays responsive so a server that just started shows green in seconds.
 */

/**
 * What the panel shows, ordered roughly by progress toward usable.
 *
 * Offline and error stay distinct: nobody listening (expected) warrants
 * "start the server", while someone answering and refusing us warrants a
 * different repair entirely.
 */
export type BridgeStatus =
  | { kind: "idle" }
  /**
   * Another panel in this browser holds the bridge. Distinct from idle because
   * idle tells the user to start their AI app, and doing that here changes
   * nothing — the panel they are looking at is not the one that would answer.
   */
  | { kind: "standby" }
  | { kind: "connecting"; attempt: number }
  | { kind: "offline"; attempt: number; nextRetryInMs: number }
  | {
      kind: "connected";
      protocolVersion: number;
      serverVersion: string;
      toolCount: number;
    }
  | {
      kind: "error";
      reason: string;
      message: string;
      nextRetryInMs: number;
      /**
       * On version_mismatch: the versions the SERVER speaks, from its nack.
       * Lets the panel tell a stale server (the user repairs it) from a stale
       * panel (resolves itself). Additive — old peers never set it.
       */
      serverSupported?: number[];
    };

/** Retry pacing. Fast enough that starting the server feels instant. */
export const RECONNECT_BASE_MS = 1_000;
/**
 * Two-tier cap — the cadence depends on WHY the last pass failed.
 *
 * Nobody listening is a poll for a peer the user is about to start, so the cap
 * stays tight; a failed loopback connect is free. A peer that answered and
 * refused us cannot be fixed by retrying until a human acts, so that cap is
 * long — hammering a live server every few seconds is noise.
 */
export const RECONNECT_OFFLINE_CAP_MS = 3_000;
export const RECONNECT_ERROR_CAP_MS = 60_000;
/** Default cap for callers that pass none; the client passes `backoffCapFor`. */
export const RECONNECT_MAX_MS = 15_000;
/** Half-jitter fraction — keeps a floor so attempt 0 never spins. */
export const RECONNECT_JITTER = 0.5;

/**
 * Exponential backoff with half-jitter, capped. The cap is a parameter because
 * the right one depends on the failure kind. Half-jitter keeps a floor so a
 * tight offline cap never collapses into a zero-delay spin.
 *
 * @param attempt 0-based: attempt 0 is the first retry, not the first connect.
 */
export function backoffDelay(
  attempt: number,
  rng: () => number = Math.random,
  capMs: number = RECONNECT_MAX_MS,
): number {
  const exp = Math.min(RECONNECT_BASE_MS * 2 ** Math.max(0, attempt), capMs);
  const jitter = exp * RECONNECT_JITTER * rng();
  return Math.round(exp - exp * RECONNECT_JITTER + jitter);
}

/**
 * The backoff cap to use after a pass that ended in this state. A present but
 * misconfigured peer gets the slow cap, an absent one the fast cap.
 */
export function backoffCapFor(status: BridgeStatus): number {
  return status.kind === "error"
    ? RECONNECT_ERROR_CAP_MS
    : RECONNECT_OFFLINE_CAP_MS;
}

/**
 * Should we keep retrying after this failure? Yes for everything but a version
 * mismatch, which no amount of retrying resolves. Other refusals may be
 * transient — the user can re-pair or restart without touching the panel.
 */
export function shouldRetry(status: BridgeStatus): boolean {
  return !(
    status.kind === "error" &&
    (status.reason === "version_mismatch" ||
      status.reason === "browser_registration_required" ||
      status.reason === "browser_capability_required")
  );
}

/** Human-facing one-liner for the panel's status chip. */
export function describeStatus(status: BridgeStatus): string {
  switch (status.kind) {
    case "idle":
      return "MCP 연결 꺼짐";
    case "standby":
      return "다른 창의 패널이 연결을 쓰고 있어요";
    case "connecting":
      return "MCP 서버를 찾는 중…";
    case "offline":
      return "MCP 서버가 실행 중이 아닙니다 — 계속 확인합니다";
    case "connected":
      return `MCP 연결됨 · 도구 ${status.toolCount}개`;
    case "error":
      return status.message;
  }
}

/**
 * Is the bridge usable right now? One predicate, so the panel and the request
 * path cannot disagree about what connected means.
 */
export function isUsable(status: BridgeStatus): boolean {
  return status.kind === "connected";
}
