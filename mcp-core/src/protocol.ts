/**
 * Bridge wire protocol — the contract between the local MCP server
 * (`@modootoday/extension-app-mcp`) and the extension side panel.
 *
 * Transport-agnostic by design: these are messages, not endpoints. Today the
 * server pushes them down an SSE stream and the extension posts replies back;
 * a WebSocket transport would carry the same shapes unchanged. Nothing here
 * may import a transport, React, or a Node built-in.
 */
import { z } from "zod";

/**
 * Bridge protocol version — deliberately independent of both the npm package
 * version and the extension version.
 *
 * npm publishes instantly; the Chrome Web Store publishes after a review
 * latency we do not control, and users auto-update on Chrome's schedule. True
 * lockstep is therefore impossible. Versioning the wire separately is
 * what lets a mismatch surface as an actionable error instead of a dead
 * socket.
 *
 * Bump on ANY incompatible change to the shapes below.
 */
export const BRIDGE_PROTOCOL_VERSION = 1;

/**
 * Every protocol version this build can speak, newest first.
 *
 * The support window is N and N-1 — never "everything forever". A promise to
 * support every version ever shipped is one a solo operator cannot keep, and
 * the cost is not code, it is a verification matrix that grows without bound.
 * Additive evolution goes through `capabilities` (below), NOT through a
 * version bump; bumping is the emergency brake for a security-forced break.
 *
 * 🔴 review-block: dropping a version from this array MUST move
 * MIN_SUPPORTED_SERVER_VERSION in the SAME commit — the gateway serves that
 * value to the panel so users get a six-month yellow nudge BEFORE the drop
 * turns their bridge red. A silent red is the failure this pairing exists to
 * prevent.
 */
export const SUPPORTED_PROTOCOL_VERSIONS: readonly number[] = [1];

/**
 * The oldest SERVER PACKAGE version (npm semver, not a protocol number) that
 * today's panel fully supports. The gateway's /api/v1/mcp/version route
 * imports this at build time and serves it to the panel, which compares it
 * against the version each connecting server reports and renders the yellow
 * "새 버전이 나왔어요" nudge for anything older.
 *
 * Raise it deliberately, never mechanically: a raise starts the nudge clock
 * for every pinned user below it. It lives next to
 * SUPPORTED_PROTOCOL_VERSIONS so a protocol drop and its nudge floor move as
 * one commit, machine-enforced by proximity rather than remembered.
 */
export const MIN_SUPPORTED_SERVER_VERSION = "0.0.1";

/**
 * MCP tool-name grammar. Verbatim from Anthropic's tool-definition docs; the
 * projection rejects anything outside it rather than silently shipping a name
 * the host will refuse.
 */
export const MCP_TOOL_NAME_RE = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * A tool as the extension describes it over the wire.
 *
 * The server never authors these — it asks the extension what it has and
 * forwards. That keeps tool schemas out of the published npm package, so
 * adding or changing a tool needs no server release.
 */
export const BridgeToolDescriptorSchema = z.object({
  /** snake_case; must satisfy MCP_TOOL_NAME_RE. */
  name: z.string(),
  /** What the tool does + when to use it. The model reads this. */
  description: z.string(),
  /** JSON Schema for the arguments, passed to the host verbatim. */
  inputSchema: z.record(z.string(), z.unknown()),
});
export type BridgeToolDescriptor = z.infer<typeof BridgeToolDescriptorSchema>;

// ---------------------------------------------------------------------------
// Handshake
// ---------------------------------------------------------------------------

/**
 * 🔴 PERMANENT ABI — review-block on any non-additive change.
 *
 * `hello` / `hello_ack` / `hello_nack` run BEFORE version negotiation, so no
 * negotiated version can ever protect them: every server binary ever shipped
 * parses these exact shapes for the rest of its life, and a pinned server on
 * a user's disk is never updated by us. The only legal evolution is adding
 * OPTIONAL fields (old parsers strip unknown keys — z.object() without
 * .strict() guarantees that, which is why .strict() is banned in this file).
 * Renaming, retyping, or making a field required breaks handshakes with
 * binaries we cannot reach.
 */

/**
 * Extension → server, first message of a session.
 *
 * The extension dials the server (an MV3 context cannot listen), so the
 * extension speaks first and proves it is us before any tool surface is
 * exposed.
 */
export const HelloSchema = z.object({
  t: z.literal("hello"),
  /** Versions this extension build can speak. */
  protocolVersions: z.array(z.number().int().positive()).min(1),
  /** For operator diagnostics + the mismatch message. */
  extensionVersion: z.string(),
  /** Pairing token. Not auto-attached by the browser (unlike a cookie). */
  token: z.string(),
  /**
   * The extension's own id (`chrome.runtime.id`). ADDITIVE: older servers
   * ignore it and identify the caller from the `Origin` header — but an
   * extension service worker's privileged loopback fetch sends no `Origin`, so
   * newer servers verify identity from this field when the header is absent.
   * Optional so every binary that predates it still parses (see the ABI note).
   */
  extensionId: z.string().optional(),
  /**
   * Feature flags this panel build understands, e.g. a future
   * "catalog-push". Additive evolution happens HERE, not via a protocol
   * bump: a capability an old peer never sent is simply absent, and code
   * must treat absence as "do not use". Optional with a default so every
   * binary that predates the field still parses.
   */
  capabilities: z.array(z.string()).default([]),
});
export type Hello = z.infer<typeof HelloSchema>;

export const HelloAckSchema = z.object({
  t: z.literal("hello_ack"),
  /** The single version both sides will use for this session. */
  protocolVersion: z.number().int().positive(),
  serverVersion: z.string(),
  /** Opaque; echoed on every later message so the server can correlate. */
  sessionId: z.string(),
  /** Server-side counterpart of Hello.capabilities. Same rules. */
  capabilities: z.array(z.string()).default([]),
});
export type HelloAck = z.infer<typeof HelloAckSchema>;

/** Why a handshake was refused. Kept coarse on purpose — see `auth.ts`. */
export const HelloNackReasonSchema = z.enum([
  /** Token missing or wrong. Deliberately not distinguished from "no token". */
  "unauthorized",
  /** No version in common. `supported` tells the extension what to do. */
  "version_mismatch",
  /** Origin header absent or not our extension. */
  "forbidden_origin",
]);
export type HelloNackReason = z.infer<typeof HelloNackReasonSchema>;

export const HelloNackSchema = z.object({
  t: z.literal("hello_nack"),
  reason: HelloNackReasonSchema,
  /** Versions the SERVER speaks — lets the extension render a real fix. */
  supported: z.array(z.number().int().positive()),
  /** Operator-facing; safe to surface in the panel. */
  message: z.string(),
});
export type HelloNack = z.infer<typeof HelloNackSchema>;

// ---------------------------------------------------------------------------
// Work
// ---------------------------------------------------------------------------

/**
 * Server → extension. A closed enum of two methods — NOT an execution channel.
 *
 * This is load-bearing for Chrome Web Store review: "Building an
 * interpreter to run complex commands fetched from a remote source, even if
 * those commands are fetched as data" is prohibited, while "fetching a remote
 * configuration file ... where all logic for the functionality is contained
 * within the extension package" is allowed. `tools/call` selects a name that
 * the extension already implements; it never carries logic, selectors, or code.
 *
 * Adding a method that accepts arbitrary script/selectors moves this package
 * from the allowed clause to the prohibited one.
 */
export const BridgeRequestSchema = z.discriminatedUnion("method", [
  z.object({
    t: z.literal("req"),
    id: z.string(),
    method: z.literal("tools/list"),
  }),
  z.object({
    t: z.literal("req"),
    id: z.string(),
    method: z.literal("tools/call"),
    /** Must be on the read-only allowlist — enforced extension-side. */
    name: z.string(),
    args: z.record(z.string(), z.unknown()),
  }),
]);
export type BridgeRequest = z.infer<typeof BridgeRequestSchema>;

/**
 * Extension → server.
 *
 * `ok: false` mirrors the workspace tool-result convention
 * (`{ ok: false, reason, message }`) so a failure crossing the bridge reads the
 * same as one inside the agent loop.
 */
export const BridgeResultSchema = z.union([
  z.object({
    t: z.literal("res"),
    id: z.string(),
    ok: z.literal(true),
    result: z.unknown(),
  }),
  z.object({
    t: z.literal("res"),
    id: z.string(),
    ok: z.literal(false),
    reason: z.string(),
    message: z.string(),
  }),
]);
export type BridgeResult = z.infer<typeof BridgeResultSchema>;

/**
 * Server → extension, on an interval, carrying no work.
 *
 * Not decorative. The side panel reaches the server through the bridge's
 * `net.stream` verb, so the SSE response body is held open by the SERVICE
 * WORKER, and an MV3 service worker dies after 30s idle. Chrome resets that
 * timer on port messages (114+), so a periodic frame is what keeps the SW —
 * and therefore the stream — alive. See HEARTBEAT_INTERVAL_MS.
 */
export const BridgeHeartbeatSchema = z.object({
  t: z.literal("hb"),
  /** Server clock, for drift diagnostics only. Never trusted for logic. */
  at: z.number().int().nonnegative(),
});
export type BridgeHeartbeat = z.infer<typeof BridgeHeartbeatSchema>;

/**
 * 20s — Chrome's own documented figure for keeping an MV3 service worker
 * alive ("Set the interval to 20 seconds to prevent the service worker from
 * becoming inactive"). Comfortably inside the 30s idle timeout with room for
 * a slow frame.
 */
export const HEARTBEAT_INTERVAL_MS = 20_000;

/** Everything the server may push down the SSE stream. */
export const BridgeDownstreamSchema = z.union([
  BridgeRequestSchema,
  BridgeHeartbeatSchema,
]);
export type BridgeDownstream = z.infer<typeof BridgeDownstreamSchema>;

/** Everything the extension may send after a successful handshake. */
export const BridgeUpstreamSchema = z.union([
  BridgeResultSchema,
  z.object({
    t: z.literal("tools"),
    id: z.string(),
    tools: z.array(BridgeToolDescriptorSchema),
  }),
]);
export type BridgeUpstream = z.infer<typeof BridgeUpstreamSchema>;

// ---------------------------------------------------------------------------
// Frame tolerance
// ---------------------------------------------------------------------------

/** Frame types each direction knows TODAY. New types extend these lists. */
export const UPSTREAM_FRAME_TYPES: readonly string[] = ["res", "tools"];
export const DOWNSTREAM_FRAME_TYPES: readonly string[] = ["req", "hb"];

/** Just enough of a frame to route it: `{ t: "..." }`. */
const FrameEnvelopeSchema = z.object({ t: z.string() });

export type FrameClassification<T> =
  | { kind: "ok"; frame: T }
  | { kind: "unknown"; frameType: string }
  | { kind: "malformed"; message: string };

/**
 * Classify an incoming frame instead of parsing it directly.
 *
 * The distinction this exists for: an UNKNOWN frame type is not an error.
 * A pinned server on a user's disk will one day receive frame types invented
 * after it shipped; if it treats them as protocol violations and drops the
 * connection, every new panel feature retroactively breaks every old install.
 * So: unknown type → skip and log, keep the session. Only a frame whose type
 * IS known but whose body does not parse is malformed — that means a real bug
 * on the sending side, and surfacing it beats guessing.
 */
export function classifyFrame<T>(
  schema: z.ZodType<T>,
  knownTypes: readonly string[],
  raw: unknown,
): FrameClassification<T> {
  const envelope = FrameEnvelopeSchema.safeParse(raw);
  if (!envelope.success) {
    return { kind: "malformed", message: "frame has no string `t` field" };
  }
  if (!knownTypes.includes(envelope.data.t)) {
    return { kind: "unknown", frameType: envelope.data.t };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      kind: "malformed",
      message: `malformed "${envelope.data.t}" frame: ${parsed.error.issues
        .map((issue) => issue.message)
        .join("; ")}`,
    };
  }
  return { kind: "ok", frame: parsed.data };
}
