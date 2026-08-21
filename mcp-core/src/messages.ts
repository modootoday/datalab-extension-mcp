/**
 * FROZEN user-facing strings — review-block on ANY edit.
 *
 * A pinned server on a user's disk is never updated, so these sentences keep
 * being shown for years, and the README's troubleshooting headings quote them
 * letter for letter so a user can search the exact text they see. Keep them
 * timeless: no version numbers, no feature names, no UI-dependent steps.
 */
export const BRIDGE_USER_MESSAGES = Object.freeze({
  /** Tool call arrived while no panel is connected. */
  panelClosed:
    "크롬에서 데이터랩툴즈 패널이 닫혀 있어요. 크롬을 열고 데이터랩툴즈 패널을 열어 두면 바로 동작해요.",
  /** The panel accepted the call but never answered inside the deadline. */
  toolTimeout:
    "브라우저 응답이 늦어지고 있어요. 크롬에서 네이버에 로그인되어 있는지 확인하고 다시 시도해 주세요.",
  /** The daemon request budget is empty. */
  rateLimited: "요청이 너무 잦아요. 잠깐 기다렸다가 다시 시도해 주세요.",
  /**
   * The local connector accepted nothing back inside its ceiling. Distinct
   * from panelClosed: that one sends the user to Chrome, which does not help
   * when the browser side is fine and the connector is what stopped.
   */
  connectorStuck:
    "연결 프로그램이 응답하지 않아요. 잠시 뒤 다시 시도하고, 계속 그러면 크롬 패널에서 MCP 연결을 껐다가 다시 켜 주세요.",
});

/**
 * Action clauses appended to the frozen message when a recoverable failure
 * rides the MCP isError result channel. Their only reader is the model driving
 * the host, so unlike BRIDGE_USER_MESSAGES they are safe to evolve.
 */
export const BRIDGE_AGENT_HINT = Object.freeze({
  /** Panel closed / not connected — the panel must be open for any tool to run. */
  notConnected:
    "The Datalab extension side panel is not open, so this tool cannot run right now. Ask the user to open the extension side panel in their browser, then call this tool again.",
  /** Daemon-wide rate limit tripped — transient. */
  rateLimited:
    "This tool is temporarily rate-limited. Wait a few seconds, then call it again.",
  /** The local connector did not answer at all — retrying immediately will not help. */
  connectorStuck:
    "The local connector stopped responding, so this tool cannot run right now. Do not retry immediately; ask the user to turn the MCP connection off and on again in the extension side panel.",
});

/**
 * Compose the isError text for a recoverable bridge failure: the frozen user
 * message plus the action clause. Kept here so the daemon and the adapter
 * phrase it identically.
 */
export function agentActionableMessage(reason: string): string {
  if (reason === "rate_limited") {
    return `${BRIDGE_USER_MESSAGES.rateLimited}\n\n${BRIDGE_AGENT_HINT.rateLimited}`;
  }
  if (reason === "connector_stuck") {
    return `${BRIDGE_USER_MESSAGES.connectorStuck}\n\n${BRIDGE_AGENT_HINT.connectorStuck}`;
  }
  return `${BRIDGE_USER_MESSAGES.panelClosed}\n\n${BRIDGE_AGENT_HINT.notConnected}`;
}
