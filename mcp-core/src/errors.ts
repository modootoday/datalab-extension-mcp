/**
 * Failure reasons — a closed enum plus retry policy, so a caller can branch on
 * WHY a call failed instead of treating every failure alike.
 *
 * 🔴 These codes are a published contract and a released package cannot be
 * re-cut at the same version, so renaming one is a breaking change. 🔴 No
 * user-facing copy here: wording belongs to the display layer, or a copy edit
 * becomes a contract change.
 */

/** Reasons a tool execution fails — decided inside the extension. */
export const MCP_TOOL_REASONS = [
  /** No tool by that name. */
  "unknown_tool",
  /** The name exists but is not open through this channel. */
  "tool_closed",
  /** This tier requires the user's consent first. */
  "needs_consent",
  /** We asked, and the user declined. */
  "not_confirmed",
  /** We asked, and the deadline passed with no answer. */
  "confirm_timeout",
  /** The answer arrived past the deadline — acting on it would surprise. */
  "confirm_too_late",
  /** The panel went away while we waited for an answer. */
  "connection_lost",
  /** Present in the tier table, but this build carries no implementation. */
  "missing_in_build",
  /** More than one editor window, so the target is ambiguous. */
  "multiple_editors",
  /** Another operation holds that editor. */
  "editor_busy",
  /** Arguments do not match the schema. */
  "invalid_args",
  /** The tool itself failed. */
  "tool_error",

  // ── Staging a binary the daemon received but did not make ──
  /** A newer attempt already ran; this one is behind it. */
  "stale_fence",
  /** A sealed asset is final — a second writer is refused, never merged. */
  "already_sealed",
  /** What arrived is not what was declared. Nothing was sealed. */
  "hash_mismatch",
  /** The upload window closed before the bytes did. */
  "upload_expired",
  /** No room right now — disk or concurrency. Time resolves it. */
  "capacity_unavailable",
  /**
   * 🔴 Not a failure: nobody could prove whether the uploads finished. Asking
   * again is worth doing, which is why it is the one staging reason that is
   * retryable.
   */
  "uploads_unproven",
] as const;

export type McpToolReason = (typeof MCP_TOOL_REASONS)[number];

/**
 * Reasons a call ends before reaching a tool — decided by the transport. Kept
 * separate because the fix differs: a tool failure means changing the request,
 * these mean waiting or repairing the connection.
 */
export const MCP_TRANSPORT_REASONS = [
  /** The panel is closed, and the panel owns the bridge. */
  "not_connected",
  /** The token bucket is empty. */
  "rate_limited",
  /** No answer arrived before the deadline. */
  "timeout",
  /** The pairing token does not match. */
  "unauthorized",
] as const;

export type McpTransportReason = (typeof MCP_TRANSPORT_REASONS)[number];

export type McpReason = McpToolReason | McpTransportReason;

/**
 * May this be called again, and after how long?
 *
 * 🔴 The test is who has to move. Anything needing a human is not retryable —
 * re-calling what the user declined just re-opens the same prompt. Only what
 * resolves on its own with time gets true.
 */
export interface ReasonPolicy {
  readonly retryable: boolean;
  /** Minimum wait when retryable. Omitted when unknown. */
  readonly retryAfterMs?: number;
}

/**
 * Per-session call budget — the published number IS the contract.
 *
 * 🔴 The server enforces these and the catalog answer quotes them, so a change
 * must move the published documentation in the same commit.
 *
 * 🔴 Declared BEFORE {@link REASON_POLICY}, which derives its retry delay from
 * the refill rate; initialisation order would otherwise force a stale copy.
 */
export const BRIDGE_LIMITS = Object.freeze({
  /** Calls available in one burst. */
  capacity: 10,
  /** Slots refilled per second. */
  refillPerSecond: 1,
});

/**
 * Largest response body the connector will pass through.
 *
 * 🔴 An oversized body is rejected whole, not truncated, and the rejection does
 * not look like one: the request waits out its deadline and the host reads that
 * as a slow tool. Production and tests must both measure against this constant.
 */
export const CONNECTOR_RESULT_CAP_BYTES = 4 * 1024 * 1024;

/**
 * Headroom divisor on the cap. The bytes we count and the bytes the connector
 * counts differ — framing, encoding, and transport wrapping sit between them.
 */
export const RESULT_HEADROOM = 4;

/** Effective bytes one response may carry. */
export const RESULT_BUDGET_BYTES = Math.floor(
  CONNECTOR_RESULT_CAP_BYTES / RESULT_HEADROOM,
);

/**
 * Retry policy per reason. The rate-limit delay is derived from
 * {@link BRIDGE_LIMITS} rather than guessed, so the advertised wait is exactly
 * how long the bucket takes to refill one slot.
 */
export const REASON_POLICY: Readonly<Record<McpReason, ReasonPolicy>> =
  Object.freeze({
    // --- Resolves on its own with time ---
    rate_limited: Object.freeze({
      retryable: true,
      retryAfterMs: Math.ceil(1000 / BRIDGE_LIMITS.refillPerSecond),
    }),
    timeout: Object.freeze({ retryable: true }),
    connection_lost: Object.freeze({ retryable: true }),
    tool_error: Object.freeze({ retryable: true }),

    // --- The request itself must change ---
    unknown_tool: Object.freeze({ retryable: false }),
    invalid_args: Object.freeze({ retryable: false }),
    tool_closed: Object.freeze({ retryable: false }),
    missing_in_build: Object.freeze({ retryable: false }),

    // --- 🔴 A human must act; re-calling only nags them ---
    needs_consent: Object.freeze({ retryable: false }),
    not_confirmed: Object.freeze({ retryable: false }),
    confirm_timeout: Object.freeze({ retryable: false }),
    confirm_too_late: Object.freeze({ retryable: false }),

    // --- The user must do something in the browser ---
    multiple_editors: Object.freeze({ retryable: false }),
    editor_busy: Object.freeze({ retryable: false }),

    // --- The connection itself must be repaired ---
    not_connected: Object.freeze({ retryable: false }),
    unauthorized: Object.freeze({ retryable: false }),

    // --- Staging: the request must change, except where nobody knows yet ---
    stale_fence: Object.freeze({ retryable: false }),
    already_sealed: Object.freeze({ retryable: false }),
    hash_mismatch: Object.freeze({ retryable: false }),
    upload_expired: Object.freeze({ retryable: false }),
    capacity_unavailable: Object.freeze({ retryable: true }),
    uploads_unproven: Object.freeze({ retryable: true }),
  });

/** Policy for a reason. An unknown reason is not retryable — safe by default. */
export function policyFor(reason: string): ReasonPolicy {
  return Object.hasOwn(REASON_POLICY, reason)
    ? REASON_POLICY[reason as McpReason]!
    : { retryable: false };
}

/** Is this string a reason we know? */
export function isKnownReason(reason: string): reason is McpReason {
  return Object.hasOwn(REASON_POLICY, reason);
}
