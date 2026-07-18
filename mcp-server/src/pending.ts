/**
 * Request correlation — pure.
 *
 * The MCP host asks synchronously; the extension answers asynchronously down a
 * stream that may drop at any moment (the browser closes, the panel closes, the
 * service worker is evicted). This maps one to the other, and its whole job is
 * to guarantee that **every request settles**. A promise that neither resolves
 * nor rejects hangs the host's turn with no error to show the user — the worst
 * failure this design can produce, and the one the surveyed bridge projects
 * actually ship.
 *
 * Kept free of timers and I/O so the exhaustion paths are testable without
 * waiting real seconds: `now` and the scheduler are injected.
 */
import { BRIDGE_USER_MESSAGES } from "@modootoday/extension-app-mcp-core";

/** Settled shape, mirroring the bridge's own result convention. */
export type PendingOutcome<T> =
  | { ok: true; result: T }
  | { ok: false; reason: string; message: string };

interface Entry<T> {
  settle: (outcome: PendingOutcome<T>) => void;
  expiresAt: number;
}

export interface PendingOptions {
  /** Injected for tests; defaults to wall clock. */
  now?: () => number;
  /** How long a request may wait before it is failed rather than left hanging. */
  timeoutMs?: number;
}

/**
 * 30s.
 *
 * Sized against the slowest thing on the other side: a tool call crossing the
 * panel, the bridge, the service worker, and a network hop. Erring long is
 * safer than erring short here — a premature timeout turns a slow-but-fine call
 * into a spurious error, and the host has its own ceiling above ours anyway.
 */
export const DEFAULT_TIMEOUT_MS = 30_000;

export class PendingRegistry<T = unknown> {
  readonly #entries = new Map<string, Entry<T>>();
  readonly #now: () => number;
  readonly #timeoutMs: number;
  #seq = 0;

  constructor(opts: PendingOptions = {}) {
    this.#now = opts.now ?? (() => Date.now());
    this.#timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /** Monotonic per-process id. Not a secret and never leaves the machine. */
  nextId(): string {
    this.#seq += 1;
    return `r${this.#seq}`;
  }

  /** How many requests are in flight. Diagnostics and tests. */
  get size(): number {
    return this.#entries.size;
  }

  /**
   * Register a request and get the promise the host will await.
   *
   * The promise is created before the caller sends anything, so a reply that
   * races back before `send` returns still finds its entry.
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
   * Settle a request by id.
   *
   * A reply for an unknown id is dropped, not thrown: it means we already timed
   * the request out, or the extension reconnected and replayed. Neither is worth
   * crashing a server over, and both are expected under a flaky stream.
   *
   * @returns whether an entry was actually settled.
   */
  settle(id: string, outcome: PendingOutcome<T>): boolean {
    const entry = this.#entries.get(id);
    if (!entry) return false;
    this.#entries.delete(id);
    entry.settle(outcome);
    return true;
  }

  /**
   * Fail everything past its deadline. Call on a tick.
   *
   * @returns how many were expired.
   */
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
   *
   * Called on disconnect. Without it, every request outstanding at the moment
   * the panel closes would hang until its own deadline, and the host would sit
   * there for 30s per call with no explanation.
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
