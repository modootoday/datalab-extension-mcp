/**
 * The bridge — the extension's side of the server.
 *
 * Transport-free: this class knows the protocol and the correlation, not the
 * socket. `send` is injected, so the whole request/response lifecycle is
 * testable without a port, and swapping SSE for something else later touches
 * only the caller.
 *
 * One connection at a time, deliberately. This server exists to serve one
 * person's browser; accepting a second panel would mean two peers racing to
 * answer the same request id, and the "last one wins" that falls out of that is
 * not a behaviour anyone should have to reason about.
 */
import {
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
  /** Pushes a frame to the connected panel. Injected — see the class doc. */
  send: (frame: BridgeDownstream) => void;
  /** The pairing token this server was started with. */
  token: string;
  /** The extension id allowed to connect. */
  extensionId: string;
  /** Reported in the handshake for operator diagnostics. */
  serverVersion: string;
  /** Diagnostics sink (stderr in production — stdout is the MCP transport). */
  log?: (message: string) => void;
  now?: () => number;
  timeoutMs?: number;
  /** Per-session request budget. Injected in tests. */
  rateLimit?: { capacity: number; refillPerSecond: number };
}

/**
 * Per-session token bucket, generous by design.
 *
 * This is not billing enforcement — it is the damper on a runaway agent loop.
 * An MCP host firing a handful of reads per turn never notices a 10-burst,
 * 1/sec bucket; a host stuck retrying in a hot loop hammers a logged-in Naver
 * session, and that is a complaint vector no transport check can absorb.
 */
const DEFAULT_RATE_LIMIT = { capacity: 10, refillPerSecond: 1 };

export interface BridgeSession {
  sessionId: string;
  protocolVersion: number;
  extensionVersion: string;
}

export class Bridge {
  readonly #deps: BridgeDeps;
  readonly #pending = new PendingRegistry<unknown>();
  #session: BridgeSession | null = null;
  #sessionSeq = 0;
  #bucketTokens = 0;
  #bucketRefilledAt = 0;
  // Last catalog the panel reported, kept across disconnects. The hosts we
  // target (Claude Desktop, Cursor) ignore tools/list_changed and cache the
  // FIRST tools/list they get; serving [] while the panel is briefly down makes
  // that cache empty forever. Serving the last-known list keeps the catalog
  // stable across a panel flap — honest because a call while disconnected still
  // fails through the isError channel (never executes without a live panel).
  #cachedTools: McpTool[] = [];

  constructor(deps: BridgeDeps) {
    this.#deps = deps;
  }

  get session(): BridgeSession | null {
    return this.#session;
  }

  /** Is a panel connected and ready to serve tool calls? */
  get connected(): boolean {
    return this.#session !== null;
  }

  /**
   * The last catalog the panel reported, or `[]` if it has never connected in
   * this daemon's life. Served from `tools/list` while the panel is
   * disconnected so a host does not cache an empty list it never re-fetches.
   */
  get lastKnownTools(): readonly McpTool[] {
    return this.#cachedTools;
  }

  /**
   * Does `presented` match the pairing token? Used to authorise the shutdown
   * request an updating adapter sends to replace a stale daemon — a local DoS
   * that a random process should not be able to trigger, so it costs the token.
   */
  verifyToken(presented: string | undefined | null): boolean {
    return checkToken(presented ?? undefined, this.#deps.token).ok;
  }

  /**
   * Run the handshake.
   *
   * Order is deliberate: origin, then token, then version. Origin and token are
   * the security gates and must both pass before we tell an unauthenticated
   * caller anything — including which protocol versions we speak, which is a
   * small fingerprint we owe nobody.
   */
  handshake(
    raw: unknown,
    origin: string | undefined | null,
  ): HelloAck | HelloNack {
    // Parse first: identity may come from the hello body (the panel's service
    // worker sends no Origin header on its privileged loopback fetch), so we
    // need the parsed body before the identity gate. safeParse never executes
    // untrusted input, and a malformed hello still reveals nothing.
    const parsed = HelloSchema.safeParse(raw);
    if (!parsed.success) {
      // Can read neither an id nor a token from a malformed hello — the same
      // coarse answer a bad token gets, revealing nothing.
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
      return {
        t: "hello_nack",
        reason: tokenCheck.reason,
        supported: [],
        message: tokenCheck.message,
      };
    }

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
    // cause is a reload that left a half-dead session behind, and refusing
    // would lock the user out of their own bridge until the server restarts.
    // Anything the old session had in flight can no longer land.
    if (this.#session) {
      this.#pending.rejectAll("superseded", "The side panel reconnected.");
    }

    this.#session = {
      // Counter, not a timestamp: two handshakes inside the same millisecond —
      // exactly what a panel reload produces — would otherwise collide, and the
      // new session would be indistinguishable from the one it replaced.
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
      // This build defines no optional behaviours yet. The field exists so
      // additive evolution has somewhere to go that is NOT a protocol bump.
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
    // Frame types from after this binary shipped are EXPECTED here, not
    // errors: this server may be years older than the panel talking to it.
    // Skip and log; dropping the session would make every new panel feature
    // retroactively break every pinned install.
    if (classified.kind === "unknown") {
      this.#deps.log?.(
        `ignoring frame type "${classified.frameType}" from a newer panel`,
      );
      return;
    }
    // A known frame with a broken body is a real bug on the sender's side;
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
      this.#pending.settle(frame.id, { ok: true, result: frame.result });
    } else {
      this.#pending.settle(frame.id, {
        ok: false,
        reason: frame.reason,
        message: frame.message,
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
   * Projection is protocol conformance only — name grammar, descriptor shape,
   * catalog size. There is deliberately NO allowlist here. A copy of the
   * allowlist used to live on this path, justified as holding "against a
   * compromised panel"; that justification was false — anything able to
   * corrupt the panel's catalog already holds the browser session itself and
   * needs no tool names from us — and the copy's real effect was to silently
   * hide every tool added after this binary shipped. Membership is enforced
   * where the session and the execution actually live: the panel executor.
   */
  async listTools(): Promise<{ tools: McpTool[]; rejected: string[] }> {
    const out = await this.#request<BridgeToolDescriptor[]>({
      method: "tools/list",
    });
    if (!out.ok) throw new BridgeError(out.reason, out.message);
    const { tools, rejected } = projectTools(out.result);
    // Refresh the cross-disconnect cache on every successful list, so it grows
    // with the panel's tool set (a newer panel can add tools) rather than
    // freezing at whatever the first list returned.
    this.#cachedTools = tools;
    return { tools, rejected: rejected.map((r) => r.name) };
  }

  /** Invoke a tool by name. The server never inspects or executes it. */
  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const out = await this.#request<unknown>({
      method: "tools/call",
      name,
      args,
    });
    if (!out.ok) throw new BridgeError(out.reason, out.message);
    return out.result;
  }

  /**
   * Refill-then-take on the session's token bucket.
   *
   * Time-based refill computed lazily on each take — no timer to leak, and
   * injectable `now` keeps it testable without waiting real seconds.
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
    // Registered before sending so a reply that races back still finds its
    // entry.
    const settled = this.#pending.register(id) as Promise<PendingOutcome<T>>;
    this.#deps.send({ t: "req", id, ...req } as BridgeDownstream);
    return settled;
  }
}

/** A failure that came from, or on the way to, the extension. */
export class BridgeError extends Error {
  readonly reason: string;
  constructor(reason: string, message: string) {
    super(message);
    this.name = "BridgeError";
    this.reason = reason;
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
