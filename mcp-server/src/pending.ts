/**
 * Request correlation — pure.
 *
 * The host asks synchronously; the extension answers down a stream that may
 * drop at any moment. 🔴 The whole job here is guaranteeing that every request
 * settles: a promise that neither resolves nor rejects hangs the host's turn
 * with no error to show, which is the worst failure this design can produce.
 * Free of timers and I/O so the exhaustion paths are testable instantly.
 */
import {
  BRIDGE_USER_MESSAGES,
  REQUEST_DEADLINE_MS,
} from "@modootoday/extension-app-mcp-core";

/**
 * Settled shape, mirroring the bridge's own result convention.
 *
 * 🔴 `ms` rides OUTSIDE `result`. The result is serialized verbatim into the
 * MCP content block the model reads; timing belongs to the host, so it travels
 * beside the payload and never inside it.
 */
export type PendingOutcome<T> =
  | { ok: true; result: T; ms?: number }
  | { ok: false; reason: string; message: string; ms?: number };

interface Entry<T> {
  settle: (outcome: PendingOutcome<T>) => void;
  expiresAt: number;
}

export interface PendingOptions {
  /** Injected for tests; defaults to wall clock. */
  now?: () => number;
  /** How long a request may wait before it is failed rather than left hanging. */
  timeoutMs?: number;
  /**
   * The per-registry prefix on every id, random by default. See
   * {@link PendingRegistry.nextId} for why it exists.
   */
  idPrefix?: string;
}

/**
 * A short random tag, unique to one registry. It only has to be unlikely to
 * repeat across two daemons on one machine within a request's lifetime, so a
 * few characters carry it. Not a secret, and it never leaves the machine.
 */
function randomPrefix(): string {
  return Math.floor(Math.random() * 0xffffff)
    .toString(36)
    .padStart(4, "0");
}

/**
 * The request deadline, shared with the panel.
 *
 * 🔴 Never hard-code a number here: this deadline and the panel's confirmation
 * window must stay in step, so both are derived from the one shared module.
 */
export const DEFAULT_TIMEOUT_MS = REQUEST_DEADLINE_MS;

export class PendingRegistry<T = unknown> {
  readonly #entries = new Map<string, Entry<T>>();
  readonly #now: () => number;
  readonly #timeoutMs: number;
  readonly #idPrefix: string;
  #seq = 0;

  constructor(opts: PendingOptions = {}) {
    this.#now = opts.now ?? (() => Date.now());
    this.#timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#idPrefix = opts.idPrefix ?? randomPrefix();
  }

  /**
   * The id a request is known by, unique for the life of this registry.
   *
   * 🔴 The prefix is load-bearing. This process is replaced routinely while
   * the panel outlives it, so a panel can reconnect to a replacement and post
   * an answer there. A bare counter restarts at one, so that id would settle
   * someone else's live call, indistinguishable from an ordinary reply.
   */
  nextId(): string {
    this.#seq += 1;
    return `${this.#idPrefix}-r${this.#seq}`;
  }

  /** How many requests are in flight. Diagnostics and tests. */
  get size(): number {
    return this.#entries.size;
  }

  /**
   * Register a request and get the promise the host will await. Created before
   * the caller sends anything, so a reply that races back before the send
   * returns still finds its entry.
   */
  register(id: string): Promise<PendingOutcome<T>> {
    return new Promise<PendingOutcome<T>>((resolve) => {
      this.#entries.set(id, {
        settle: resolve,
        expiresAt: this.#now() + this.#timeoutMs,
      });
    });
  }

  /**
   * Settle a request by id. A reply for an unknown id is dropped rather than
   * thrown — the request already timed out, or the extension reconnected and
   * replayed, and both are expected under a flaky stream.
   */
  settle(id: string, outcome: PendingOutcome<T>): boolean {
    const entry = this.#entries.get(id);
    if (!entry) return false;
    this.#entries.delete(id);
    entry.settle(outcome);
    return true;
  }

  /** Fail everything past its deadline. Called on a tick by the daemon. */
  sweep(): number {
    const now = this.#now();
    let expired = 0;
    for (const [id, entry] of this.#entries) {
      if (entry.expiresAt <= now) {
        this.#entries.delete(id);
        entry.settle({
          ok: false,
          reason: "timeout",
          message: BRIDGE_USER_MESSAGES.toolTimeout,
        });
        expired += 1;
      }
    }
    return expired;
  }

  /**
   * Fail everything now — the stream dropped, so nothing in flight can land.
   * Without this, every request outstanding when the panel closes would hang
   * until its own deadline with no explanation.
   */
  rejectAll(reason: string, message: string): number {
    const n = this.#entries.size;
    for (const [id, entry] of this.#entries) {
      this.#entries.delete(id);
      entry.settle({ ok: false, reason, message });
    }
    return n;
  }
}
