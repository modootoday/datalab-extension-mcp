/**
 * 🔴 FROZEN user-facing strings — review-block on ANY edit.
 *
 * These sentences ship inside the server binary, and a pinned server on a
 * user's disk is never updated by us: whatever is written here will be shown
 * to users years from now. Two consequences drive the rules below.
 *
 *   1. They are written as timeless generalities — no version numbers, no
 *      feature names that could stop existing, no instructions that depend on
 *      UI that might move.
 *   2. The README's troubleshooting headings quote these sentences LETTER FOR
 *      LETTER — that is how a non-technical user gets from the sentence on
 *      screen to the fix (they search the exact text). Editing a sentence here
 *      without the README breaks that path; editing it at all abandons every
 *      already-shipped binary that still shows the old wording.
 *
 * Korean because the product's users are Korean and these are the only two
 * strings of ours an MCP host will ever show them.
 */
export const BRIDGE_USER_MESSAGES = Object.freeze({
  /** Tool call arrived while no panel is connected. */
  panelClosed:
    "크롬에서 데이터랩툴즈 패널이 닫혀 있어요. 크롬을 열고 데이터랩툴즈 패널을 열어 두면 바로 동작해요.",
  /** The panel accepted the call but never answered inside the deadline. */
  toolTimeout:
    "브라우저 응답이 늦어지고 있어요. 크롬에서 네이버에 로그인되어 있는지 확인하고 다시 시도해 주세요.",
  /** The session hit the per-session rate limit. */
  rateLimited: "요청이 너무 잦아요. 잠깐 기다렸다가 다시 시도해 주세요.",
});

/**
 * Agent-facing action clauses (English), appended to the frozen Korean message
 * when a recoverable tool-call failure rides the MCP `isError` result channel.
 *
 * NOT part of BRIDGE_USER_MESSAGES: those are frozen, README-quoted, user-facing
 * strings. These are a SEPARATE, additive layer whose only reader is the model
 * driving the host — so the agent knows to take the action and RETRY rather than
 * treat the tool as broken. The Korean message still reaches the human; this
 * short English imperative reaches the model. Safe to evolve independently.
 */
export const BRIDGE_AGENT_HINT = Object.freeze({
  /** Panel closed / not connected — the panel must be open for any tool to run. */
  notConnected:
    "The Datalab extension side panel is not open, so this tool cannot run right now. Ask the user to open the Chrome extension side panel, then call this tool again.",
  /** Per-session rate limit tripped — transient. */
  rateLimited:
    "This tool is temporarily rate-limited. Wait a few seconds, then call it again.",
});

/**
 * Compose the `isError` text for a recoverable bridge failure: the frozen
 * Korean user message the human sees, plus the English action clause the model
 * acts on. Kept here so the daemon and the adapter phrase it identically.
 */
export function agentActionableMessage(reason: string): string {
  const hint =
    reason === "rate_limited"
      ? BRIDGE_AGENT_HINT.rateLimited
      : BRIDGE_AGENT_HINT.notConnected;
  const user =
    reason === "rate_limited"
      ? BRIDGE_USER_MESSAGES.rateLimited
      : BRIDGE_USER_MESSAGES.panelClosed;
  return `${user}\n\n${hint}`;
}
