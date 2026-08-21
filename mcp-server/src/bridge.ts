/**
 * Transport-free bridge protocol and browser-session correlation.
 */
import {
  BROWSER_ROUTING_CAPABILITY,
  BRIDGE_AUTH_CAPABILITY,
  BRIDGE_LIMITS,
  BRIDGE_PROTOCOL_VERSION,
  BRIDGE_USER_MESSAGES,
  CALL_TOOL,
  LOCAL_FILE_REQUEST_CAPABILITY,
  REQUIRED_BROWSER_CAPABILITIES,
  BridgeUpstreamSchema,
  HelloSchema,
  MIN_TOKEN_LENGTH,
  UPSTREAM_FRAME_TYPES,
  checkExtensionIdentity,
  checkToken,
  classifyFrame,
  resolveCredential,
  timingSafeEqual,
  negotiateProtocol,
  projectTools,
  type BridgeDownstream,
  type BrowserRouting,
  type BridgeToolDescriptor,
  type HelloAck,
  type HelloNack,
  type McpTool,
} from "@modootoday/extension-app-mcp-core";

import { digestToken } from "./token-digest.js";
import {
  DEFAULT_TIMEOUT_MS,
  PendingRegistry,
  type PendingOutcome,
} from "./pending.js";

export interface BridgeDeps {
  /**
   * Pushes a frame to the connected panel. Returns whether it reached an open
   * stream — nobody listening is a different thing from delivered-and-never-
   * answered, and the two deserve different waits.
   */
  send: (frame: BridgeDownstream, key: string) => boolean;
  /** The pairing token this server was started with. */
  token: string;
  /** The extension ids allowed to connect. */
  extensionIds: readonly string[];
  /** Reported in the handshake for operator diagnostics. */
  serverVersion: string;
  /** Diagnostics sink (stderr in production — stdout is the MCP transport). */
  log?: (message: string) => void;
  now?: () => number;
  timeoutMs?: number;
  /** Process-wide request budget. Injected in tests. */
  rateLimit?: { capacity: number; refillPerSecond: number };
}

/**
 * One token bucket for the server, generous by design: not billing enforcement
 * but a damper on a runaway agent loop hammering connected browsers.
 *
 * The numbers come from the shared contract, which is also quoted in the
 * catalog answer, the retry delay, and the published docs. A local literal
 * would turn those three into lies with every test still passing.
 */
const DEFAULT_RATE_LIMIT = BRIDGE_LIMITS;

export interface BridgeSession {
  sessionId: string;
  protocolVersion: number;
  extensionVersion: string;
}

/**
 * What became of an answer. `dropped` covers a reply nobody was waiting for,
 * which is ordinary under a flaky stream; `unauthorized` is a caller reaching
 * for a session that is not theirs, which is not.
 */
export type ReceiveOutcome = "settled" | "dropped" | "unauthorized";

interface SessionEntry {
  readonly key: string;
  readonly session: BridgeSession;
  readonly pending: PendingRegistry<unknown>;
  readonly tokenHash: string;
  readonly routingRequired: boolean;
  readonly fileRequestBound: boolean;
  streamActive: boolean;
  readonly filePermits: Map<string, FilePermit>;
}

interface FilePermit {
  readonly expiresAt: number;
  readonly tool: "editor_insert_image" | "gallery_image_add";
  readonly path: string;
}

export type FileAuthorizationReason =
  | "file_session_token_missing"
  | "file_session_token_mismatch"
  | "file_session_not_live"
  | "file_request_expired"
  | "file_request_mismatch";

export type FileAuthorization =
  | {
      ok: true;
      key: string;
      sessionId: string;
      requestId: string;
      credential: "claimed_browser";
      requestBound: true;
    }
  | {
      ok: false;
      reason: FileAuthorizationReason;
      credential: "root" | "claimed_browser" | "unknown" | "missing";
      key?: string;
      sessionId?: string;
      requestId?: string;
    };

/**
 * A tag for this server's request ids, so a reply meant for a daemon we
 * replaced can never settle one of ours. Each session appends its own id to
 * this, and that pair is what keeps two browsers from minting the same one.
 */
function daemonIdTag(): string {
  return Math.floor(Math.random() * 0xffffff)
    .toString(36)
    .padStart(4, "0");
}

export class Bridge {
  readonly #deps: BridgeDeps;
  readonly #sessions = new Map<string, SessionEntry>();
  /** browserId to the name it reported, for datalab_browsers. */
  readonly #labels = new Map<string, string>();
  readonly #idTag = daemonIdTag();
  #sessionSeq = 0;
  #defaultKey: string | null = null;
  #bucketTokens = 0;
  #bucketRefilledAt = 0;
  // Last catalog the panel reported, kept across disconnects: many hosts cache
  // the first list they get, so serving an empty one during a brief outage
  // would empty that cache for good. A call while disconnected still fails.
  #cachedTools: McpTool[] = [];

  constructor(deps: BridgeDeps) {
    this.#deps = deps;
    const limit = deps.rateLimit ?? DEFAULT_RATE_LIMIT;
    this.#bucketTokens = limit.capacity;
    this.#bucketRefilledAt = (deps.now ?? Date.now)();
  }

  /**
   * The session a request with no browser named goes to. Map preserves
   * insertion order, so this is the oldest one — while the key space holds a
   * single key there is never more than one to choose between.
   */
  #primary(): SessionEntry | null {
    if (this.#defaultKey !== null) {
      const held = this.#sessions.get(this.#defaultKey);
      if (held?.streamActive) return held;
    }
    for (const entry of this.#sessions.values()) {
      if (entry.streamActive) return entry;
    }
    return null;
  }

  /**
   * The browsers a caller could address, oldest first.
   *
   * `primary` marks the one an unaddressed call reaches, because that default
   * is invisible otherwise: with two profiles connected a host would keep
   * landing in the older one and never learn why the newer one saw nothing.
   */
  connectedBrowsers(): Array<{
    id: string;
    name: string | null;
    primary: boolean;
  }> {
    const keys = [...this.#sessions.values()]
      .filter((entry) => entry.streamActive)
      .map((entry) => entry.key);
    const primary = this.#primary()?.key ?? null;
    return keys.map((id) => ({
      id,
      name: this.#labels.get(id) ?? null,
      primary: primary === id,
    }));
  }

  /**
   * The only place a registry is born, and it is born already in the map.
   * One living anywhere else would be missed by `sweep` and by `#closeSession`,
   * and the promises inside it would never settle.
   *
   * Rejecting whatever held this key comes first, in the same breath rather
   * than at a call site that could forget it. A registry dropped with a request
   * still inside hangs the host's turn with nothing to show.
   *
   * Written to the same key rather than removed and re-added: a Map keeps a
   * key where it was. Removing it would send this browser to the back, and the
   * oldest session is where a call with no browser named goes — so a panel
   * reload would quietly hand one browser's work to another.
   */
  #installSession(
    key: string,
    session: BridgeSession,
    auth: {
      tokenHash: string;
      routingRequired: boolean;
      fileRequestBound: boolean;
    },
  ): void {
    const held = this.#sessions.get(key);
    if (held) {
      held.pending.rejectAll("superseded", "The side panel reconnected.");
    }
    this.#sessions.set(key, {
      key,
      session,
      tokenHash: auth.tokenHash,
      routingRequired: auth.routingRequired,
      fileRequestBound: auth.fileRequestBound,
      streamActive: false,
      filePermits: new Map(),
      pending: new PendingRegistry<unknown>({
        now: this.#deps.now,
        timeoutMs: this.#deps.timeoutMs,
        // Deterministic, not random. An id is the only thing a reply carries
        // that says who it belongs to, so two sessions minting the same one
        // would cross-settle; chance is not a routing guarantee.
        idPrefix: `${this.#idTag}${session.sessionId}`,
      }),
    });
  }

  /**
   * The only place a session leaves the map, and rejecting comes first. That
   * order is the invariant: a registry dropped with a request still inside it
   * hangs the host's turn with nothing to show, which `pending.ts` names as the
   * worst outcome this design can produce.
   */
  // Named for what it must not do: reach past `key`. Every request in every
  // other session outlives this call, and the only reachable proof of that is
  // a later session going away while an earlier one waits.
  #closeSession(key: string, reason: string, message: string): number {
    const entry = this.#sessions.get(key);
    if (!entry) return 0;
    const rejected = entry.pending.rejectAll(reason, message);
    this.#sessions.delete(key);
    return rejected;
  }

  get session(): BridgeSession | null {
    return this.#primary()?.session ?? null;
  }

  /** Which browser holds the bridge, of the keys this server hands out. */
  get sessionKey(): string | null {
    return this.#primary()?.key ?? null;
  }

  /**
   * The key a session id belongs to, or null once that session is gone. What a
   * stream needs: it is opened by a panel that knows only the id it was given,
   * and the socket has to be filed under the browser, not the handshake.
   */
  keyForSession(sessionId: string): string | null {
    for (const entry of this.#sessions.values()) {
      if (entry.session.sessionId === sessionId) return entry.key;
    }
    return null;
  }

  sessionForKey(key: string): BridgeSession | null {
    return this.#sessions.get(key)?.session ?? null;
  }

  /** Is a panel connected and ready to serve tool calls? */
  get connected(): boolean {
    return this.#primary() !== null;
  }

  activateSession(key: string, sessionId: string): boolean {
    const entry = this.#sessions.get(key);
    if (!entry || entry.session.sessionId !== sessionId) return false;
    entry.streamActive = true;
    if (this.#defaultKey === null) this.#defaultKey = key;
    return true;
  }

  isSessionStreamActive(key: string, sessionId: string): boolean {
    const entry = this.#sessions.get(key);
    return entry?.session.sessionId === sessionId && entry.streamActive;
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
   * Does the presented value match the pairing token this server was started
   * with? Authorises the shutdown an updating adapter sends, which no other
   * local process should be able to trigger.
   *
   * The root token only. A browser's own credential must never open this:
   * one browser could then end another's unattended run.
   */
  verifyRootToken(presented: string | undefined | null): boolean {
    return checkToken(presented ?? undefined, this.#deps.token).ok;
  }

  /**
   * May this credential add a browser to this machine?
   *
   * The root token, or a browser already registered here. Binding this to the
   * root alone tied the right to add a browser to whoever installed last, so
   * the second browser's only offered path was to install again -- which moved
   * the right away from the first one, which then had the same problem.
   *
   * Does the presented value belong to the session it names?
   *
   * A credential nobody is using opens nothing: this is bound to the session
   * entry, not to the key alone, and it gates a route that reads files off the
   * operator's disk.
   */
  #fileCredential(
    entry: SessionEntry,
    presented: string,
  ): "claimed_browser" | null {
    const hash = digestToken(presented);
    return timingSafeEqual(hash, entry.tokenHash) ? "claimed_browser" : null;
  }

  #fileCredentialClass(presented: string): "root" | "unknown" {
    return this.verifyRootToken(presented) ? "root" : "unknown";
  }

  authorizeFileRequest(input: {
    sessionId: string;
    requestId: string;
    token: string | undefined | null;
    path: string;
    tool?: string;
  }): FileAuthorization {
    const entry = [...this.#sessions.values()].find(
      (candidate) => candidate.session.sessionId === input.sessionId,
    );
    if (!entry) {
      return {
        ok: false,
        reason: "file_session_not_live",
        credential:
          typeof input.token === "string" && input.token.length > 0
            ? this.#fileCredentialClass(input.token)
            : "missing",
      };
    }
    if (typeof input.token !== "string" || input.token.length === 0) {
      return {
        ok: false,
        reason: "file_session_token_missing",
        credential: "missing",
        key: entry.key,
        sessionId: entry.session.sessionId,
        requestId: input.requestId,
      };
    }
    const credential = this.#fileCredential(entry, input.token);
    if (!credential) {
      return {
        ok: false,
        reason: "file_session_token_mismatch",
        credential: this.#fileCredentialClass(input.token),
        key: entry.key,
        sessionId: entry.session.sessionId,
        requestId: input.requestId,
      };
    }
    if (!entry.fileRequestBound) {
      return {
        ok: false,
        reason: "file_request_expired",
        credential,
        key: entry.key,
        sessionId: entry.session.sessionId,
        requestId: input.requestId,
      };
    }
    const now = (this.#deps.now ?? Date.now)();
    for (const [requestId, permit] of entry.filePermits) {
      if (permit.expiresAt <= now) entry.filePermits.delete(requestId);
    }
    const permit = entry.filePermits.get(input.requestId);
    if (!permit) {
      return {
        ok: false,
        reason: "file_request_expired",
        credential,
        key: entry.key,
        sessionId: entry.session.sessionId,
        requestId: input.requestId,
      };
    }
    if (permit.path !== input.path || permit.tool !== input.tool) {
      return {
        ok: false,
        reason: "file_request_mismatch",
        credential,
        key: entry.key,
        sessionId: entry.session.sessionId,
        requestId: input.requestId,
      };
    }
    return {
      ok: true,
      key: entry.key,
      sessionId: entry.session.sessionId,
      requestId: input.requestId,
      credential,
      requestBound: true,
    };
  }

  consumeFileRequest(auth: Extract<FileAuthorization, { ok: true }>): boolean {
    const entry = this.#sessions.get(auth.key);
    if (
      !entry ||
      !entry.streamActive ||
      entry.session.sessionId !== auth.sessionId
    ) {
      return false;
    }
    if (!auth.requestBound) return true;
    if (
      auth.requestId === undefined ||
      !entry.filePermits.has(auth.requestId)
    ) {
      return false;
    }
    entry.filePermits.delete(auth.requestId);
    return true;
  }

  cancelFileRequest(input: {
    sessionId: string;
    requestId: string;
    token: string | undefined | null;
  }): FileAuthorizationReason | null {
    const entry = [...this.#sessions.values()].find(
      (candidate) => candidate.session.sessionId === input.sessionId,
    );
    if (!entry || !entry.streamActive) return "file_session_not_live";
    if (
      typeof input.token !== "string" ||
      !this.#fileCredential(entry, input.token)
    ) {
      return "file_session_token_mismatch";
    }
    if (!entry.filePermits.delete(input.requestId)) {
      return "file_request_expired";
    }
    return null;
  }

  /**
   * Run the handshake.
   *
   * Order is deliberate: identity, then token, then version. Both gates must
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
      this.#deps.extensionIds,
    );
    if (!idCheck.ok) {
      return {
        t: "hello_nack",
        reason: idCheck.reason,
        supported: [],
        message: idCheck.message,
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
    const bearerRequired = parsed.data.capabilities.includes(
      BRIDGE_AUTH_CAPABILITY,
    );
    const routingRequired = parsed.data.capabilities.includes(
      BROWSER_ROUTING_CAPABILITY,
    );
    const fileRequestBound = parsed.data.capabilities.includes(
      LOCAL_FILE_REQUEST_CAPABILITY,
    );
    if (!bearerRequired || !routingRequired || !fileRequestBound) {
      return {
        t: "hello_nack",
        reason: "browser_capability_required",
        supported: [],
        message:
          "This browser panel is outdated. Close and reopen the side panel before reconnecting.",
      };
    }

    const tokenHash = digestToken(parsed.data.token);
    const credential = resolveCredential(
      { token: parsed.data.token, browserId: parsed.data.browserId },
      { rootToken: this.#deps.token },
    );
    if (credential.kind !== "claimed") {
      this.#deps.log?.("refused an unauthorized browser credential");
      return {
        t: "hello_nack",
        reason: credential.reason,
        supported: [],
        message: credential.message,
      };
    }
    const key = credential.browserId;
    // Self-reported, and only ever a display name. Kept beside the session so
    // it lives exactly as long as the browser is here to be addressed.
    const label = parsed.data.browserLabel?.trim();
    if (label) this.#labels.set(key, label);
    else this.#labels.delete(key);
    const held = this.#sessions.get(key);
    if (held?.streamActive) {
      return {
        t: "hello_nack",
        reason: "session_active",
        supported: [],
        message: "This browser already has an active side-panel session.",
      };
    }
    const session: BridgeSession = {
      // A counter, not a timestamp: a panel reload produces two handshakes
      // inside one millisecond, and the new session must never be
      // indistinguishable from the one it replaced.
      sessionId: `s${(this.#sessionSeq += 1).toString(36)}`,
      protocolVersion: negotiated.version,
      extensionVersion: parsed.data.extensionVersion,
    };
    this.#installSession(key, session, {
      tokenHash,
      routingRequired,
      fileRequestBound,
    });
    return {
      t: "hello_ack",
      protocolVersion: negotiated.version,
      serverVersion: this.#deps.serverVersion,
      sessionId: session.sessionId,
      capabilities: [...REQUIRED_BROWSER_CAPABILITIES],
    };
  }

  /**
   * May a caller presenting `presented` act on this session — open its stream,
   * answer its requests?
   *
   * The routes this guards carry the tool results the model reads, so a
   * caller that can post one decides what the model is told. Loopback reach is
   * not the gate: another local process has it too, which is why the shutdown
   * and file routes already refuse on a token.
   */
  authorizeSession(key: string, presented: string | undefined | null): boolean {
    const entry = this.#sessions.get(key);
    if (!entry) return false;
    return this.#mayAct(entry, presented);
  }

  #mayAct(entry: SessionEntry, presented: string | undefined | null): boolean {
    if (typeof presented !== "string" || presented.length === 0) return false;
    return timingSafeEqual(digestToken(presented), entry.tokenHash);
  }

  /**
   * Route a frame from the panel to whoever is waiting for it.
   *
   * `presented` is the credential the poster carried.
   */
  receive(raw: unknown, presented?: string | null): ReceiveOutcome {
    const classified = classifyFrame(
      BridgeUpstreamSchema,
      UPSTREAM_FRAME_TYPES,
      raw,
    );
    // Frame types invented after this binary shipped are expected, not
    // errors — this server may be years older than the panel talking to it.
    // Dropping the session would break every pinned install on a new feature.
    if (classified.kind === "unknown") {
      this.#deps.log?.(
        `ignoring frame type "${classified.frameType}" from a newer panel`,
      );
      return "dropped";
    }
    // A known frame with a broken body is a real bug on the sender's side, but
    // still not worth killing the user's other in-flight calls over.
    if (classified.kind === "malformed") {
      this.#deps.log?.(classified.message);
      return "dropped";
    }

    const frame = classified.frame;
    if (frame.t === "tools") {
      return this.#settle(
        frame.id,
        { ok: true, result: frame.tools },
        presented,
        frame.route?.browserId,
      );
    }
    if (frame.ok) {
      const settled = this.#settle(
        frame.id,
        {
          ok: true,
          result: frame.result,
          ...(frame.ms === undefined ? {} : { ms: frame.ms }),
        },
        presented,
        frame.route?.browserId,
      );
      if (
        settled === "settled" &&
        !(
          typeof frame.result === "object" &&
          frame.result !== null &&
          (frame.result as { status?: unknown }).status === "awaiting_confirm"
        )
      ) {
        this.#discardFilePermit(frame.id);
      }
      return settled;
    }
    const settled = this.#settle(
      frame.id,
      {
        ok: false,
        reason: frame.reason,
        message: frame.message,
        ...(frame.ms === undefined ? {} : { ms: frame.ms }),
      },
      presented,
      frame.route?.browserId,
    );
    if (settled === "settled") this.#discardFilePermit(frame.id);
    return settled;
  }

  /**
   * The id is the only axis a reply carries, and the prefixes make it unique
   * across sessions, so the registry that recognises it is the right one.
   *
   * Ownership is asked before settling, and a refusal stops the scan rather
   * than falling through to the next session. Falling through would let a
   * caller barred from one session settle an id in another that happened to
   * mint the same one — and would report "unknown", which reads as an ordinary
   * late reply.
   */
  #settle(
    id: string,
    outcome: PendingOutcome<unknown>,
    presented: string | undefined | null,
    browserId?: string,
  ): ReceiveOutcome {
    for (const entry of this.#sessions.values()) {
      if (!entry.pending.owns(id)) continue;
      if (!this.#mayAct(entry, presented)) return "unauthorized";
      if (entry.routingRequired && browserId !== entry.key) {
        entry.pending.settle(id, {
          ok: false,
          reason: "browser_unknown",
          message: "The responding browser did not match the routed browser.",
        });
        return "settled";
      }
      entry.pending.settle(id, outcome);
      return "settled";
    }
    return "dropped";
  }

  #discardFilePermit(id: string): void {
    for (const entry of this.#sessions.values()) {
      if (entry.filePermits.delete(id)) return;
    }
  }

  /** One panel went away. Nothing it owed can land, so settle that session now. */
  disconnect(key: string): void {
    this.#closeSession(
      key,
      "disconnected",
      "The side panel disconnected before answering.",
    );
  }

  /** The server is going. Every session loses its answer at once. */
  disconnectAll(): void {
    for (const key of [...this.#sessions.keys()]) this.disconnect(key);
  }

  /** Expire anything past its deadline. Driven by the caller's timer. */
  sweep(): number {
    let expired = 0;
    for (const entry of this.#sessions.values()) {
      expired += entry.pending.sweep();
      const now = (this.#deps.now ?? Date.now)();
      for (const [requestId, permit] of entry.filePermits) {
        if (permit.expiresAt <= now) entry.filePermits.delete(requestId);
      }
    }
    return expired;
  }

  /**
   * Ask the panel for its tools, and project them.
   *
   * Projection is protocol conformance only — name grammar, descriptor
   * shape, catalog size — with no membership check. Membership is enforced
   * where the session and the execution live, in the panel's own executor.
   */
  async listTools(browser?: string): Promise<{
    tools: McpTool[];
    rejected: string[];
  }> {
    const out = await this.#request<BridgeToolDescriptor[]>(
      { method: "tools/list" },
      browser,
    );
    if (!out.ok) throw new BridgeError(out.reason, out.message);
    const { tools, rejected } = projectTools(out.result);
    // Refreshed on every successful list so it tracks a newer panel's tool set.
    //
    // Never overwritten with an empty list: a healthy panel cannot report
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
   * Returns timing beside the result rather than folded into it. `toolMs` is
   * what the panel spent executing; `bridgeMs` is this whole round trip, so
   * `bridgeMs - toolMs` is the transport and the queue. A single total cannot
   * tell a slow tool from a slow wire, and that is the question being asked.
   */
  async callTool(
    name: string,
    args: Record<string, unknown>,
    browser?: string,
  ): Promise<{ result: unknown; toolMs?: number; bridgeMs: number }> {
    const startedAt = (this.#deps.now ?? Date.now)();
    const out = await this.#request<unknown>(
      {
        method: "tools/call",
        name,
        args,
      },
      browser,
    );
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
   * Refill-then-take on the daemon's token bucket. The refill is computed
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
    browser?: string,
  ): Promise<PendingOutcome<T>> {
    let entry: SessionEntry | null;
    if (browser === undefined) {
      entry = this.#primary();
    } else {
      entry = this.#sessions.get(browser) ?? null;
      if (!entry) {
        return {
          ok: false,
          reason: "browser_unknown",
          message: "No browser here answers to that id.",
        };
      }
      if (!entry.streamActive) {
        return {
          ok: false,
          reason: "browser_detached",
          message: "That browser was here but its side panel is closed.",
        };
      }
    }
    if (!entry) {
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
    const id = entry.pending.nextId();
    const routing: BrowserRouting | undefined = entry.routingRequired
      ? {
          targetBrowserId: entry.key,
          explicit: browser !== undefined,
          fallbackFromPinned:
            browser === undefined &&
            this.#defaultKey !== null &&
            this.#defaultKey !== entry.key,
          connectedBrowserCount: this.connectedBrowsers().length,
        }
      : undefined;
    const delegatedTool =
      req.method === "tools/call" && req.name === CALL_TOOL
        ? req.args["tool"]
        : undefined;
    const delegatedArgs =
      req.method === "tools/call" &&
      typeof req.args["args"] === "object" &&
      req.args["args"] !== null &&
      !Array.isArray(req.args["args"])
        ? (req.args["args"] as Record<string, unknown>)
        : null;
    const fileTool =
      req.method === "tools/call" &&
      (req.name === "editor_insert_image" || req.name === "gallery_image_add")
        ? req.name
        : delegatedTool === "editor_insert_image" ||
            delegatedTool === "gallery_image_add"
          ? delegatedTool
          : null;
    const fileArgs =
      delegatedArgs ?? (req.method === "tools/call" ? req.args : null);
    const path = fileArgs?.["path"];
    if (
      entry.fileRequestBound &&
      fileTool !== null &&
      typeof path === "string" &&
      path.length > 0
    ) {
      entry.filePermits.set(id, {
        expiresAt:
          (this.#deps.now ?? Date.now)() +
          (this.#deps.timeoutMs ?? DEFAULT_TIMEOUT_MS),
        tool: fileTool,
        path,
      });
    }
    // Registered before sending, so a reply that races back still finds it.
    const settled = entry.pending.register(id) as Promise<PendingOutcome<T>>;
    const delivered = this.#deps.send(
      {
        t: "req",
        id,
        ...req,
        ...(routing ? { routing } : {}),
      } as BridgeDownstream,
      entry.key,
    );
    // A handshake is not a delivery: the session can exist while the stream
    // it answers on is detached, and the frame then reaches nobody. Without
    // this the request would wait out its whole deadline in silence.
    if (!delivered) {
      entry.filePermits.delete(id);
      entry.pending.settle(id, {
        ok: false,
        reason: "not_connected",
        message: BRIDGE_USER_MESSAGES.panelClosed,
      });
    }
    const outcome = await settled;
    if (outcome.ok && (browser !== undefined || this.#defaultKey === null)) {
      this.#defaultKey = entry.key;
    }
    return outcome;
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
