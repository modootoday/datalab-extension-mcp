/**
 * Idle lifecycle — ref-count plus a debounced idle timeout. The panel stream
 * and each in-flight call hold a ref; when the count reaches zero the window
 * arms, and expiring at zero closes the panel and exits.
 *
 * 🔴 The debounce is what keeps several hosts starting at once from tripping
 * an idle-exit mid-burst, so any activity resets it.
 */

/** Opaque handle a timer scheduler hands back so it can be cancelled. */
export type TimerHandle = unknown;

export interface LifecycleDeps {
  /**
   * How long the count may sit at zero before the daemon reclaims itself. The
   * default is long enough to survive a multi-app start storm, short enough
   * that an abandoned daemon does not linger.
   */
  idleMs?: number;
  /** Schedules the idle callback. Injected in tests; defaults to setTimeout. */
  setTimer?: (fn: () => void, ms: number) => TimerHandle;
  /** Cancels a scheduled callback. Injected in tests; defaults to clearTimeout. */
  clearTimer?: (handle: TimerHandle) => void;
  /**
   * Fired once the daemon has been idle for the full window at zero refs.
   * Production closes the panel and exits the process here.
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
   * Begin idle accounting. Called once at startup so a daemon nobody ever uses
   * still reclaims itself.
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
    // 🔴 Guarded so a stray double-release cannot drive the count negative and
    // wedge the daemon alive forever.
    this.#refs = Math.max(0, this.#refs - 1);
    if (this.#refs === 0) this.#arm();
  }

  /**
   * Traffic crossed the daemon — reset the debounce. A no-op while refs are
   * held; at zero refs it re-arms the window, so a steady drip of stateless
   * requests keeps the daemon warm without holding a long-lived ref.
   */
  bump(): void {
    if (this.#refs === 0) this.#arm();
  }

  #arm(): void {
    this.#cancelTimer();
    this.#timer = this.#setTimer(() => {
      this.#timer = null;
      // 🔴 Re-checked at fire time so a retain that landed after the window
      // armed still wins, even if its cancel raced the timer.
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
