/**
 * How long one request lives, and how much of that a human may spend answering
 * a confirmation.
 *
 * The confirmation window MUST fit inside the request deadline. If it does
 * not, a late approval executes (and bills) a paid tool after the server has
 * already returned failure to the host, and the answer is discarded. Both the
 * server and the extension import these constants so they cannot drift apart.
 */

/** Server gives up here: human answer time plus the tool's own run time. */
export const REQUEST_DEADLINE_MS = 90_000;

/**
 * Budget reserved for AFTER approval — tool execution plus the lag between the
 * server starting its timer and the extension receiving the request. A call
 * that needs no confirmation gets this as its whole working window.
 */
export const EXEC_RESERVE_MS = 30_000;

/**
 * How long a human may take. Silence resolves as refusal — it can never stand
 * in for approval of a destructive or paid call.
 */
export const CONFIRM_TIMEOUT_MS = REQUEST_DEADLINE_MS - EXEC_RESERVE_MS;
