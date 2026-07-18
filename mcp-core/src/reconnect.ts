/**
 * Connection state + reconnect policy — pure.
 *
 * The operator's model (2026-07-16): open the side panel, glance at a status
 * indicator, done. The MCP server is a process they start and stop at will, so
 * "server not running" is the NORMAL state, not an error — the panel keeps
 * trying quietly and goes green when the server appears.
 *
 * That inverts the usual reconnect posture. We are not recovering from a fault;
 * we are polling for a peer that may simply not exist yet. So: no error toast,
 * no give-up, and a backoff that stays responsive rather than creeping toward
 * minutes — the user who just ran `npx` should see green in seconds.
 *
 */

/**
 * What the panel shows. Ordered roughly by progress toward usable.
 *
 * `offline` and `error` are deliberately distinct: `offline` means nobody is
 * listening (expected — server not started), `error` means someone answered and
 * refused us (unexpected — bad token, version skew). They warrant different
 * copy: the first is "start the server", the second is "something is wrong".
 */
export type BridgeStatus =
  | { kind: "idle" }
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
       * On version_mismatch: the protocol versions the SERVER speaks, from
       * its nack. Lets the panel tell "server is stale" (red, one-click
       * repair) from "panel is stale" (yellow, resolves itself on the next
       * deploy). Optional and additive — old peers simply never set it.
       */
      serverSupported?: number[];
    };

/** Retry pacing. Fast enough that starting the server feels instant. */
export const RECONNECT_BASE_MS = 1_000;
/**
 * Two-tier cap — the cadence depends on WHY the last pass failed.
 *
 * `offline`/`connecting` mean nobody is listening: this is a poll for a peer
 * the user is about to start, so the cap is tight (~3s) — the user who just ran
 * `npx` sees green in seconds instead of waiting out a long window. A failed
 * loopback connect every ~3s is free.
 *
 * `error` means someone answered and REFUSED us (bad token, port squatter,
 * forbidden origin). Retrying cannot fix that until a human acts, so the cap is
 * long (~60s) — the card already tells them what to do; hammering a live server
 * every few seconds is noise, not progress.
 */
export const RECONNECT_OFFLINE_CAP_MS = 3_000;
export const RECONNECT_ERROR_CAP_MS = 60_000;
/**
 * Back-compat default cap. Kept at the historical 15s so callers that do not
 * pass an explicit cap behave as before; the client passes `backoffCapFor`.
 */
export const RECONNECT_MAX_MS = 15_000;
/** Half-jitter fraction — see `backoffDelay`. Keeps a floor so attempt 0 never spins. */
export const RECONNECT_JITTER = 0.5;

/**
 * Exponential backoff with half-jitter, capped.
 *
 * The cap is a parameter, not a constant, because the right cap depends on the
 * failure kind (see the two caps above and `backoffCapFor`). Jitter stays at
 * half — `delay ∈ [0.5·exp, 1.0·exp]` — so it keeps a floor and never
 * collapses toward a zero-delay spin on a tight offline cap.
 *
 * @param attempt 0-based. Attempt 0 is the first retry, not the first connect.
 * @param rng     Injected for determinism in tests.
 * @param capMs   Ceiling for the exponential term. Defaults to the historical 15s.
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
 * The backoff cap to use after a pass that ended with `status`.
 *
 * `error` (peer present, misconfigured) → slow; everything else (peer absent,
 * still trying) → fast. This is what makes "go green in seconds when the
 * server appears" and "stop hammering a server that refuses us" coexist.
 */
export function backoffCapFor(status: BridgeStatus): number {
  return status.kind === "error"
    ? RECONNECT_ERROR_CAP_MS
    : RECONNECT_OFFLINE_CAP_MS;
}

/**
 * Should we keep retrying after this failure?
 *
 * Yes for everything except a version mismatch. A mismatch is not transient —
 * retrying cannot fix it, and hammering a server that will refuse us until a
 * human updates something is pure noise. Every other refusal (bad token,
 * forbidden origin) may be transient: the user can re-pair, and the server can
 * be restarted with the right token, both without touching the panel.
 */
export function shouldRetry(status: BridgeStatus): boolean {
  return !(status.kind === "error" && status.reason === "version_mismatch");
}

/** Human-facing one-liner for the panel's status chip. */
export function describeStatus(status: BridgeStatus): string {
  switch (status.kind) {
    case "idle":
      return "MCP 연결 꺼짐";
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
 * Is the bridge usable right now?
 *
 * A single predicate so the panel and the request path cannot disagree about
 * what "connected" means.
 */
export function isUsable(status: BridgeStatus): boolean {
  return status.kind === "connected";
}
