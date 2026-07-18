/**
 * Idle lifecycle — ref-count plus a debounced idle timeout.
 *
 * The daemon is a shared resource worth keeping warm while anyone is using it,
 * and worth reclaiming when nobody is. "Using it" is counted: the panel's SSE
 * stream and each in-flight tool call each hold a ref. When the count reaches
 * zero the idle timer arms; when it expires with the count still zero, the
 * daemon closes the panel and exits.
 *
 * The debounce matters. Several MCP hosts starting at once make adapters
 * connect-and-drop in quick succession, and a naive "exit the moment refs hit
 * 0" would fire an idle-exit right in the middle of that burst. So any activity
 * — a retain, or a bump on traffic — resets the window, and the window is a few
 * minutes wide, wide enough that a spawn storm never trips it.
 *
 * The clock and the timer are injected so every path is testable against a fake
 * clock, with no real minutes spent waiting.
 */

/** Opaque handle a timer scheduler hands back so it can be cancelled. */
export type TimerHandle = unknown;

export interface LifecycleDeps {
  /**
   * How long the count may sit at zero before the daemon reclaims itself.
   * Default 5 minutes — long enough to survive a multi-app start storm, short
   * enough that an abandoned daemon does not linger.
   */
  idleMs?: number;
  /** Schedules the idle callback. Injected in tests; defaults to setTimeout. */
  setTimer?: (fn: () => void, ms: number) => TimerHandle;
  /** Cancels a scheduled callback. Injected in tests; defaults to clearTimeout. */
  clearTimer?: (handle: TimerHandle) => void;
  /**
   * Fired once when the daemon has been idle for the full window with zero
   * refs. Production closes the panel and exits the process here.
   */
  onIdle: () => void;
}

const DEFAULT_IDLE_MS = 5 * 60 * 1000;

export class Lifecycle {
  #refs = 0;
  #timer: TimerHandle = null;
  readonly #idleMs: number;
  readonly #setTimer: (fn: () => void, ms: number) => TimerHandle;
  readonly #clearTimer: (handle: TimerHandle) => void;
  readonly #onIdle: () => void;

  constructor(deps: LifecycleDeps) {
    this.#idleMs = deps.idleMs ?? DEFAULT_IDLE_MS;
    this.#setTimer =
      deps.setTimer ??
      ((fn, ms) => {
        const t = setTimeout(fn, ms);
        // Never let the idle timer itself keep the process alive.
        t.unref?.();
        return t;
      });
    this.#clearTimer =
      deps.clearTimer ?? ((h) => clearTimeout(h as NodeJS.Timeout));
    this.#onIdle = deps.onIdle;
  }

  /** Current ref-count. Diagnostics and tests. */
  get refs(): number {
    return this.#refs;
  }

  /**
   * Begin idle accounting.
   *
   * Called once at startup so a daemon nobody ever uses still reclaims itself:
   * refs are zero, so the window arms immediately.
   */
  start(): void {
    if (this.#refs === 0) this.#arm();
  }

  /** A connection worth staying alive for opened. Cancels any pending idle-exit. */
  retain(): void {
    this.#refs += 1;
    this.#cancelTimer();
  }

  /** A connection closed. When the last one goes, the idle window arms. */
  release(): void {
    // Guarded so a stray double-release can never drive the count negative and
    // wedge the daemon alive forever.
    this.#refs = Math.max(0, this.#refs - 1);
    if (this.#refs === 0) this.#arm();
  }

  /**
   * Traffic crossed the daemon — reset the debounce.
   *
   * While refs are held there is no timer to reset, so this is a no-op then.
   * With refs at zero (a stateless `/mcp` POST between adapter connections) it
   * re-arms the full window, so a steady drip of requests keeps the daemon warm
   * without ever holding a long-lived ref.
   */
  bump(): void {
    if (this.#refs === 0) this.#arm();
  }

  #arm(): void {
    this.#cancelTimer();
    this.#timer = this.#setTimer(() => {
      this.#timer = null;
      // Re-check at fire time: a retain that landed after the window armed but
      // before it expired must win even if its cancel somehow raced the timer.
      if (this.#refs === 0) this.#onIdle();
    }, this.#idleMs);
  }

  #cancelTimer(): void {
    if (this.#timer !== null) {
      this.#clearTimer(this.#timer);
      this.#timer = null;
    }
  }
}
