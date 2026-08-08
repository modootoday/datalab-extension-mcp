/**
 * The bridge — the extension's side of the server.
 *
 * Transport-free: it knows the protocol and the correlation, not the socket,
 * so the send is injected and the whole lifecycle is testable without a port.
 *
 * 🔴 One connection at a time. A second panel would mean two peers racing to
 * answer the same request id, and last-one-wins is not reasonable behaviour.
 */
import {
  BRIDGE_LIMITS,
  BRIDGE_PROTOCOL_VERSION,
  BRIDGE_USER_MESSAGES,
  BridgeUpstreamSchema,
  HelloSchema,
  MIN_TOKEN_LENGTH,
  UPSTREAM_FRAME_TYPES,
  checkExtensionIdentity,
  checkToken,
  classifyFrame,
  negotiateProtocol,
  projectTools,
  type BridgeDownstream,
  type BridgeToolDescriptor,
  type HelloAck,
  type HelloNack,
  type McpTool,
} from "@modootoday/extension-app-mcp-core";

import { PendingRegistry, type PendingOutcome } from "./pending.js";

export interface BridgeDeps {
  /**
   * Pushes a frame to the connected panel. Returns whether it reached an open
   * stream — nobody listening is a different thing from delivered-and-never-
   * answered, and the two deserve different waits.
   */
  send: (frame: BridgeDownstream) => boolean;
  /** The pairing token this server was started with. */
  token: string;
  /** The extension id allowed to connect. */
  extensionId: string;
  /** Reported in the handshake for operator diagnostics. */
  serverVersion: string;
  /** Diagnostics sink (stderr in production — stdout is the MCP transport). */
  log?: (message: string) => void;
  /**
   * Our pairing token is stale and nobody can reach us. Production exits here
   * so the next call starts a server holding the current token.
   */
  onStaleToken?: () => void;
  now?: () => number;
  timeoutMs?: number;
  /** Per-session request budget. Injected in tests. */
  rateLimit?: { capacity: number; refillPerSecond: number };
}

/**
 * Per-session token bucket, generous by design: not billing enforcement but a
 * damper on a runaway agent loop hammering a logged-in session.
 *
 * 🔴 The numbers come from the shared contract, which is also quoted in the
 * catalog answer, the retry delay, and the published docs. A local literal
 * would turn those three into lies with every test still passing.
 */
const DEFAULT_RATE_LIMIT = BRIDGE_LIMITS;

/**
 * Refusals in a row before concluding our own token is the stale one. High
 * enough that a stray attempt never ends a healthy server, low enough that a
 * user who just issued a new token is not left waiting.
 */
const STALE_TOKEN_LIMIT = 5;

export interface BridgeSession {
  sessionId: string;
  protocolVersion: number;
  extensionVersion: string;
}

export class Bridge {
  readonly #deps: BridgeDeps;
  // 🔴 Built in the constructor, not at field initialisation: initialisers run
  // before the constructor body, so deps would not exist yet and the injected
  // clock and timeout would silently fall back to their defaults.
  readonly #pending: PendingRegistry<unknown>;
  #session: BridgeSession | null = null;
  #sessionSeq = 0;
  /** Consecutive handshakes refused for the token alone. See `#noteStaleToken`. */
  #badTokenStreak = 0;
  #bucketTokens = 0;
  #bucketRefilledAt = 0;
  // Last catalog the panel reported, kept across disconnects: many hosts cache
  // the first list they get, so serving an empty one during a brief outage
  // would empty that cache for good. A call while disconnected still fails.
  #cachedTools: McpTool[] = [];

  constructor(deps: BridgeDeps) {
    this.#deps = deps;
    this.#pending = new PendingRegistry<unknown>({
      now: deps.now,
      timeoutMs: deps.timeoutMs,
    });
  }

  get session(): BridgeSession | null {
    return this.#session;
  }

  /** Is a panel connected and ready to serve tool calls? */
  get connected(): boolean {
    return this.#session !== null;
  }

  /**
   * The last catalog the panel reported, empty if it has never connected in
   * this daemon's life. Served while the panel is disconnected so a host does
   * not cache an empty list it never re-fetches.
   */
  get lastKnownTools(): readonly McpTool[] {
    return this.#cachedTools;
  }

  /**
   * Does the presented value match the pairing token? Authorises the shutdown
   * an updating adapter sends, which no other local process should be able to
   * trigger — hence the token.
   */
  verifyToken(presented: string | undefined | null): boolean {
    return checkToken(presented ?? undefined, this.#deps.token).ok;
  }

  /**
   * The extension is right about the token, and we can be wrong about it.
   *
   * 🔴 This server is detached and outlives the app that started it, and a
   * replacement only takes over when its version is newer. Once the user
   * issues a fresh token, stepping aside is gated on the very token that no
   * longer matches, so the server has to notice on its own. A run of refusals
   * with nobody connected says exactly that, and exiting costs nothing.
   */
  #noteStaleToken(): void {
    if (this.#session) return; // someone is connected — our token is fine
    this.#badTokenStreak += 1;
    if (this.#badTokenStreak < STALE_TOKEN_LIMIT) return;
    this.#deps.log?.(
      `refused ${this.#badTokenStreak} handshakes for a stale token; stepping aside`,
    );
    this.#badTokenStreak = 0;
    this.#deps.onStaleToken?.();
  }

  /**
   * Run the handshake.
   *
   * 🔴 Order is deliberate: identity, then token, then version. Both gates must
   * pass before an unauthorised caller learns anything — including which
   * protocol versions we speak, which is a fingerprint we owe nobody.
   */
  handshake(
    raw: unknown,
    origin: string | undefined | null,
  ): HelloAck | HelloNack {
    // Parsed first because identity may come from the hello body: the panel's
    // service worker sends no Origin on its privileged loopback fetch. Parsing
    // executes nothing, and a malformed hello still reveals nothing.
    const parsed = HelloSchema.safeParse(raw);
    if (!parsed.success) {
      // Neither an id nor a token can be read, so it gets the same coarse
      // answer a bad token does.
      return {
        t: "hello_nack",
        reason: "unauthorized",
        supported: [],
        message: "Malformed handshake.",
      };
    }

    const idCheck = checkExtensionIdentity(
      origin,
      parsed.data.extensionId,
      this.#deps.extensionId,
    );
    if (!idCheck.ok) {
      return {
        t: "hello_nack",
        reason: idCheck.reason,
        supported: [],
        message: idCheck.message,
      };
    }

    const tokenCheck = checkToken(parsed.data.token, this.#deps.token);
    if (!tokenCheck.ok) {
      this.#noteStaleToken();
      return {
        t: "hello_nack",
        reason: tokenCheck.reason,
        supported: [],
        message: tokenCheck.message,
      };
    }
    // A token that works clears the count: whatever those refusals were, our
    // own token is not stale.
    this.#badTokenStreak = 0;

    const negotiated = negotiateProtocol(parsed.data.protocolVersions);
    if (!negotiated.ok) {
      return {
        t: "hello_nack",
        reason: negotiated.reason,
        supported: negotiated.supported,
        message: negotiated.message,
      };
    }

    // A second panel replaces the first rather than being refused: the usual
    // cause is a reload leaving a half-dead session behind, and refusing would
    // lock the user out of their own bridge until the server restarts.
    if (this.#session) {
      this.#pending.rejectAll("superseded", "The side panel reconnected.");
    }

    this.#session = {
      // 🔴 A counter, not a timestamp: a panel reload produces two handshakes
      // inside one millisecond, and the new session must never be
      // indistinguishable from the one it replaced.
      sessionId: `s${(this.#sessionSeq += 1).toString(36)}`,
      protocolVersion: negotiated.version,
      extensionVersion: parsed.data.extensionVersion,
    };
    // A fresh session starts with a full request budget.
    const limit = this.#deps.rateLimit ?? DEFAULT_RATE_LIMIT;
    this.#bucketTokens = limit.capacity;
    this.#bucketRefilledAt = (this.#deps.now ?? Date.now)();
    return {
      t: "hello_ack",
      protocolVersion: negotiated.version,
      serverVersion: this.#deps.serverVersion,
      sessionId: this.#session.sessionId,
      // No optional behaviours in this build. The field exists so additive
      // evolution has somewhere to go that is not a protocol bump.
      capabilities: [],
    };
  }

  /** Route a frame from the panel to whoever is waiting for it. */
  receive(raw: unknown): void {
    const classified = classifyFrame(
      BridgeUpstreamSchema,
      UPSTREAM_FRAME_TYPES,
      raw,
    );
    // 🔴 Frame types invented after this binary shipped are expected, not
    // errors — this server may be years older than the panel talking to it.
    // Dropping the session would break every pinned install on a new feature.
    if (classified.kind === "unknown") {
      this.#deps.log?.(
        `ignoring frame type "${classified.frameType}" from a newer panel`,
      );
      return;
    }
    // A known frame with a broken body is a real bug on the sender's side, but
    // still not worth killing the user's other in-flight calls over.
    if (classified.kind === "malformed") {
      this.#deps.log?.(classified.message);
      return;
    }

    const frame = classified.frame;
    if (frame.t === "tools") {
      this.#pending.settle(frame.id, { ok: true, result: frame.tools });
      return;
    }
    if (frame.ok) {
      this.#pending.settle(frame.id, {
        ok: true,
        result: frame.result,
        ...(frame.ms === undefined ? {} : { ms: frame.ms }),
      });
    } else {
      this.#pending.settle(frame.id, {
        ok: false,
        reason: frame.reason,
        message: frame.message,
        ...(frame.ms === undefined ? {} : { ms: frame.ms }),
      });
    }
  }

  /** The panel went away. Nothing in flight can land, so settle it all now. */
  disconnect(): void {
    this.#session = null;
    this.#pending.rejectAll(
      "disconnected",
      "The side panel disconnected before answering.",
    );
  }

  /** Expire anything past its deadline. Driven by the caller's timer. */
  sweep(): number {
    return this.#pending.sweep();
  }

  /**
   * Ask the panel for its tools, and project them.
   *
   * 🔴 Projection is protocol conformance only — name grammar, descriptor
   * shape, catalog size — with no membership check. Membership is enforced
   * where the session and the execution live, in the panel's own executor.
   */
  async listTools(): Promise<{ tools: McpTool[]; rejected: string[] }> {
    const out = await this.#request<BridgeToolDescriptor[]>({
      method: "tools/list",
    });
    if (!out.ok) throw new BridgeError(out.reason, out.message);
    const { tools, rejected } = projectTools(out.result);
    // Refreshed on every successful list so it tracks a newer panel's tool set.
    //
    // 🔴 Never overwritten with an empty list: a healthy panel cannot report
    // zero, and caching that one anomaly would make it permanent for every
    // later disconnect.
    if (tools.length > 0) {
      this.#cachedTools = tools;
    } else if (this.#cachedTools.length > 0) {
      this.#deps.log?.(
        `tools/list returned 0 tools (${rejected.length} rejected); keeping the ${this.#cachedTools.length} previously cached`,
      );
    }
    return { tools, rejected: rejected.map((r) => r.name) };
  }

  /**
   * Invoke a tool by name. The server never inspects or executes it.
   *
   * 🔴 Returns timing beside the result rather than folded into it. `toolMs` is
   * what the panel spent executing; `bridgeMs` is this whole round trip, so
   * `bridgeMs - toolMs` is the transport and the queue. A single total cannot
   * tell a slow tool from a slow wire, and that is the question being asked.
   */
  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ result: unknown; toolMs?: number; bridgeMs: number }> {
    const startedAt = (this.#deps.now ?? Date.now)();
    const out = await this.#request<unknown>({
      method: "tools/call",
      name,
      args,
    });
    const bridgeMs = (this.#deps.now ?? Date.now)() - startedAt;
    if (!out.ok) {
      // Timing survives the failure: a call that timed out and a call that was
      // refused look the same to a host that only sees the message.
      throw new BridgeError(out.reason, out.message, {
        ...(out.ms === undefined ? {} : { toolMs: out.ms }),
        bridgeMs,
      });
    }
    return {
      result: out.result,
      ...(out.ms === undefined ? {} : { toolMs: out.ms }),
      bridgeMs,
    };
  }

  /**
   * Refill-then-take on the session's token bucket. The refill is computed
   * lazily on each take, so there is no timer to leak and an injected clock
   * keeps it testable without waiting real seconds.
   */
  #takeRateToken(): boolean {
    const limit = this.#deps.rateLimit ?? DEFAULT_RATE_LIMIT;
    const now = (this.#deps.now ?? Date.now)();
    const elapsedSeconds = (now - this.#bucketRefilledAt) / 1000;
    if (elapsedSeconds > 0) {
      this.#bucketTokens = Math.min(
        limit.capacity,
        this.#bucketTokens + elapsedSeconds * limit.refillPerSecond,
      );
      this.#bucketRefilledAt = now;
    }
    if (this.#bucketTokens < 1) return false;
    this.#bucketTokens -= 1;
    return true;
  }

  async #request<T>(
    req:
      | { method: "tools/list" }
      | { method: "tools/call"; name: string; args: Record<string, unknown> },
  ): Promise<PendingOutcome<T>> {
    if (!this.#session) {
      return {
        ok: false,
        reason: "not_connected",
        message: BRIDGE_USER_MESSAGES.panelClosed,
      };
    }
    if (!this.#takeRateToken()) {
      return {
        ok: false,
        reason: "rate_limited",
        message: BRIDGE_USER_MESSAGES.rateLimited,
      };
    }
    const id = this.#pending.nextId();
    // Registered before sending, so a reply that races back still finds it.
    const settled = this.#pending.register(id) as Promise<PendingOutcome<T>>;
    const delivered = this.#deps.send({
      t: "req",
      id,
      ...req,
    } as BridgeDownstream);
    // 🔴 A handshake is not a delivery: the session can exist while the stream
    // it answers on is detached, and the frame then reaches nobody. Without
    // this the request would wait out its whole deadline in silence.
    if (!delivered) {
      this.#pending.settle(id, {
        ok: false,
        reason: "not_connected",
        message: BRIDGE_USER_MESSAGES.panelClosed,
      });
    }
    return settled;
  }
}

/** A failure that came from, or on the way to, the extension. */
export class BridgeError extends Error {
  readonly reason: string;
  /** Optional so every existing throw site still compiles unchanged. */
  readonly timing?: { toolMs?: number; bridgeMs: number };
  constructor(
    reason: string,
    message: string,
    timing?: { toolMs?: number; bridgeMs: number },
  ) {
    super(message);
    this.name = "BridgeError";
    this.reason = reason;
    if (timing) this.timing = timing;
  }
}

/** Reject a token the server was started with before it can be used. */
export function assertUsableToken(token: string): void {
  if (token.length < MIN_TOKEN_LENGTH) {
    throw new Error(
      `Pairing token must be at least ${MIN_TOKEN_LENGTH} characters; got ${token.length}.`,
    );
  }
}

export { BRIDGE_PROTOCOL_VERSION };
