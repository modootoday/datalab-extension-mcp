/**
 * The pairing desk's wire: how the side panel learns which AI app is asking to
 * connect, and answers. One POST route, one request shape, one status shape.
 */
import { z } from "zod";

export const PAIRING_ROUTE = "/bridge/pairing";

/** The longest app name the desk keeps; longer names are cut, never refused. */
export const APP_NAME_MAX = 64;

/** The AI app's name as the daemon stores and shows it. Null when nothing is left. */
export function normalizeAppName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const printable = Array.from(raw, (ch) => {
    const code = ch.charCodeAt(0);
    return code < 0x20 || code === 0x7f ? " " : ch;
  });
  const cleaned = printable.join("").trim();
  if (cleaned.length === 0) return null;
  return cleaned.slice(0, APP_NAME_MAX);
}

export const PairingActionSchema = z.enum([
  "status",
  "approve",
  "refuse",
  "revoke",
]);
export type PairingAction = z.infer<typeof PairingActionSchema>;

export const PairingRequestSchema = z.object({
  action: PairingActionSchema,
  /** The panel's pairing token. Approving while unpaired pairs with it. */
  token: z.string(),
  /** The extension's own id; the panel's service worker sends no Origin. */
  extensionId: z.string().optional(),
  /** The app an approve, refuse or revoke is about. */
  app: z.string().max(APP_NAME_MAX).optional(),
});
export type PairingRequest = z.infer<typeof PairingRequestSchema>;

export const PendingAppSchema = z.object({
  name: z.string(),
  /** Epoch ms of the first call that asked. */
  askedAt: z.number().int().nonnegative(),
});
export type PendingApp = z.infer<typeof PendingAppSchema>;

export const ApprovedAppSchema = z.object({
  name: z.string(),
  /** ISO time of the user's approval. */
  approvedAt: z.string(),
});
export type ApprovedApp = z.infer<typeof ApprovedAppSchema>;

export const PairingStatusSchema = z.object({
  /** A pairing record or a configured token exists on this computer. */
  paired: z.boolean(),
  /** The presented token is the paired one. False for another browser profile. */
  yours: z.boolean(),
  /** An unpaired connector still accepts a claim. */
  windowOpen: z.boolean(),
  /** Epoch ms when the claim window ends; null once paired. */
  windowEndsAt: z.number().int().nonnegative().nullable(),
  /** Empty unless the presented token is the paired one, or nothing is paired yet. */
  pending: z.array(PendingAppSchema),
  /** Empty unless the presented token is the paired one. */
  apps: z.array(ApprovedAppSchema),
});
export type PairingStatus = z.infer<typeof PairingStatusSchema>;

/** Why the desk refused an action. Coarse, like the handshake's reasons. */
export const PairingRefusalSchema = z.enum([
  "forbidden_origin",
  "unauthorized",
  "paired_elsewhere",
  "window_closed",
  "unknown_app",
  "bad_request",
]);
export type PairingRefusal = z.infer<typeof PairingRefusalSchema>;

export const PairingAnswerSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), status: PairingStatusSchema }),
  z.object({ ok: z.literal(false), reason: PairingRefusalSchema }),
]);
export type PairingAnswer = z.infer<typeof PairingAnswerSchema>;

/** The header an adapter sends with the AI app's name on every /mcp call. */
export const MCP_APP_HEADER = "x-datalab-mcp-app";
