/**
 * Bridge wire protocol — the contract between the local MCP server and the
 * extension side panel.
 *
 * These are messages, not endpoints: the server pushes them down an SSE stream
 * and the extension posts replies back, but another transport would carry the
 * same shapes. Nothing here may import a transport, React, or a Node built-in.
 */
import { z } from "zod";

/**
 * Bridge protocol version — independent of both the npm package version and
 * the extension version, because those two can never publish in lockstep.
 * Versioning the wire separately is what turns skew into an actionable error
 * instead of a dead socket. Bump on ANY incompatible change below.
 */
export const BRIDGE_PROTOCOL_VERSION = 1;

/**
 * Every protocol version this build can speak, newest first. The support
 * window is N and N-1. Additive evolution goes through capabilities below,
 * NOT a version bump; bumping is the brake for a security-forced break.
 *
 * review-block: dropping a version MUST raise MIN_SUPPORTED_SERVER_VERSION in
 * the same commit, so users are nudged before their bridge turns red. (That
 * floor also moves on operator decision; see it for which reasons count.)
 */
export const SUPPORTED_PROTOCOL_VERSIONS: readonly number[] = [1];

/**
 * The oldest server PACKAGE version (npm semver, not a protocol number) that
 * today's panel fully supports. The panel compares it against the version each
 * connecting server reports and nudges the user to update anything older.
 *
 * Below it the panel refuses the connector outright (`outdated_server`), so
 * this is a compatibility gate and not a nudge. Two reasons move it, both
 * deliberate. One is a PROTOCOL drop. The other is a credential change the
 * older generation cannot serve, which is what 1.9.0 is: from there the
 * pairing token itself opens a browser session and the registration ledger is
 * gone, so a 1.8.x connector answers a correct key with a refusal. npm will
 * not remove the versions below it, so this gate is the sole thing that moves
 * those installs forward.
 */
export const MIN_SUPPORTED_SERVER_VERSION = "1.9.0";

/**
 * MCP tool-name grammar. The projection rejects anything outside it rather
 * than shipping a name the host will refuse.
 */
export const MCP_TOOL_NAME_RE = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * A tool as the extension describes it over the wire. The server never authors
 * these — it asks the extension and forwards, which keeps tool schemas out of
 * the published package so a tool change needs no server release.
 */
export const BridgeToolDescriptorSchema = z.object({
  /** snake_case; must satisfy MCP_TOOL_NAME_RE. */
  name: z.string(),
  /** What the tool does + when to use it. The model reads this. */
  description: z.string(),
  /** JSON Schema for the arguments, passed to the host verbatim. */
  inputSchema: z.record(z.string(), z.unknown()),
  /**
   * MCP tool annotations, derived from the tool's tier. Optional by ABI rule.
   *
   * Typed loosely because this end only forwards it; pinning the shape here
   * would make every future hint a wire-contract change.
   *
   * A server predating this field strips it, so annotations never arrive
   * there. Anything that must survive such a server goes inside the input
   * schema, which is forwarded verbatim.
   */
  annotations: z.record(z.string(), z.unknown()).optional(),
});
export type BridgeToolDescriptor = z.infer<typeof BridgeToolDescriptorSchema>;

// ---------------------------------------------------------------------------
// Handshake
// ---------------------------------------------------------------------------

/**
 * PERMANENT ABI — review-block on any non-additive change.
 *
 * The hello frames run BEFORE version negotiation, so nothing protects them:
 * every server binary ever shipped parses these exact shapes for life. The
 * only legal evolution is adding OPTIONAL fields — old parsers strip unknown
 * keys, which is why .strict() is banned in this file.
 */

/**
 * Extension to server, first message of a session. The extension dials (an MV3
 * context cannot listen), so it speaks first and proves its identity before
 * any tool surface is exposed.
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
   * The extension's own id. Additive: an extension service worker's privileged
   * loopback fetch sends no Origin header, so servers verify identity from this
   * field when the header is absent.
   */
  extensionId: z.string().optional(),
  /**
   * Which install this panel belongs to. The extension id names the product
   * and is the same for everyone, so it cannot tell one browser from another;
   * this is minted per install and can. Additive, and absent from a panel that
   * predates it.
   */
  browserId: z.string().optional(),
  /**
   * What to call this browser in `datalab_browsers`. Self-reported, because
   * with one key per machine there is no registration row left to carry a
   * name. A display label authorises nothing.
   */
  browserLabel: z.string().max(64).optional(),
  /**
   * Feature flags this panel build understands. Additive evolution happens
   * HERE, not via a protocol bump: a capability an old peer never sent is
   * simply absent, and code must treat absence as "do not use".
   */
  capabilities: z.array(z.string()).default([]),
});
export type Hello = z.infer<typeof HelloSchema>;

/**
 * "Every later request of mine carries the credential in an Authorization
 * header — refuse any that does not."
 *
 * The panel declaring it is what turns the gate on for its session, because
 * the server cannot tell a panel that predates the header from a local process
 * that simply omitted it. A session that never declares stays on the older
 * behaviour, which is the behaviour it shipped with; one that declares closes
 * the answer routes to everything but itself.
 */
export const BRIDGE_AUTH_CAPABILITY = "bridge-auth-bearer";

/** The panel and daemon bind routed calls to the selected browser install. */
export const BROWSER_ROUTING_CAPABILITY = "browser-routing-v1";

/** Local-file reads require a session, request, and exact path permit. */
export const LOCAL_FILE_REQUEST_CAPABILITY = "local-file-request-v1";

export const REQUIRED_BROWSER_CAPABILITIES = Object.freeze([
  BRIDGE_AUTH_CAPABILITY,
  BROWSER_ROUTING_CAPABILITY,
  LOCAL_FILE_REQUEST_CAPABILITY,
] as const);

/** The credential in `Authorization: Bearer <token>`, or null. */
export function bearerToken(header: string | undefined | null): string | null {
  if (typeof header !== "string") return null;
  const match = /^Bearer (.+)$/i.exec(header.trim());
  return match ? match[1]! : null;
}

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
  /** This browser already has an active event stream. */
  "session_active",
  /** Root authority cannot open a browser session. */
  "browser_registration_required",
  /** This panel predates mandatory browser routing and file permits. */
  "browser_capability_required",
]);
export type HelloNackReason = z.infer<typeof HelloNackReasonSchema>;

export const BrowserRoutingSchema = z.object({
  targetBrowserId: z.string(),
  explicit: z.boolean(),
  fallbackFromPinned: z.boolean(),
  connectedBrowserCount: z.number().int().nonnegative(),
});
export type BrowserRouting = z.infer<typeof BrowserRoutingSchema>;

export const BrowserRouteEchoSchema = z.object({
  browserId: z.string(),
});
export type BrowserRouteEcho = z.infer<typeof BrowserRouteEchoSchema>;

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
 * Server to extension. A closed enum of two methods — NOT an execution channel.
 *
 * Load-bearing for Chrome Web Store review: an extension may fetch remote
 * configuration when all the logic lives in the extension package, but may not
 * interpret commands fetched from elsewhere. A tool call selects a name the
 * extension already implements; it never carries logic, selectors, or code.
 */
export const BridgeRequestSchema = z.discriminatedUnion("method", [
  z.object({
    t: z.literal("req"),
    id: z.string(),
    method: z.literal("tools/list"),
    routing: BrowserRoutingSchema.optional(),
  }),
  z.object({
    t: z.literal("req"),
    id: z.string(),
    method: z.literal("tools/call"),
    /** Must be on the read-only allowlist — enforced extension-side. */
    name: z.string(),
    args: z.record(z.string(), z.unknown()),
    routing: BrowserRoutingSchema.optional(),
  }),
]);
export type BridgeRequest = z.infer<typeof BridgeRequestSchema>;

/**
 * Extension to server. The failure shape mirrors the tool-result convention so
 * a failure crossing the bridge reads the same as one inside the agent loop.
 */
/**
 * How long the panel spent executing, in ms.
 *
 * A SIBLING of `result`, never a field inside it. The panel's result is
 * serialized verbatim into the MCP `content` block, so anything placed there is
 * read by the model on every single call — paying tokens forever to answer a
 * question only the host asked. Optional because a pinned panel does not send
 * it, and a missing number must not fail the frame.
 */
const elapsedMs = z.number().nonnegative().optional();

export const BridgeResultSchema = z.union([
  z.object({
    t: z.literal("res"),
    id: z.string(),
    ok: z.literal(true),
    result: z.unknown(),
    ms: elapsedMs,
    route: BrowserRouteEchoSchema.optional(),
  }),
  z.object({
    t: z.literal("res"),
    id: z.string(),
    ok: z.literal(false),
    reason: z.string(),
    message: z.string(),
    // Carried on failure too: the timing of a call that FAILED is exactly
    // what tells a timeout apart from a refusal.
    ms: elapsedMs,
    route: BrowserRouteEchoSchema.optional(),
  }),
]);
export type BridgeResult = z.infer<typeof BridgeResultSchema>;

/**
 * Server to extension, on an interval, carrying no work.
 *
 * Not decorative. The SSE response body is held open by the extension's
 * service worker, which Chrome evicts after 30s idle; a periodic frame resets
 * that timer and is what keeps the stream alive.
 */
export const BridgeHeartbeatSchema = z.object({
  t: z.literal("hb"),
  /** Server clock, for drift diagnostics only. Never trusted for logic. */
  at: z.number().int().nonnegative(),
});
export type BridgeHeartbeat = z.infer<typeof BridgeHeartbeatSchema>;

/**
 * 20s — Chrome's documented figure for keeping an MV3 service worker alive,
 * comfortably inside the 30s idle timeout with room for a slow frame.
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
    route: BrowserRouteEchoSchema.optional(),
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
 * An unknown frame type is not an error. A pinned server will one day
 * receive types invented after it shipped; dropping the connection over them
 * would make every new panel feature retroactively break old installs. Only a
 * known type with an unparseable body is malformed — that is a real bug.
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
