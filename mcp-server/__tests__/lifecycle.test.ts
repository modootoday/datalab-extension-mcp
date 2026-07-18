/**
 * Idle lifecycle against a fake clock — no real minutes spent waiting.
 *
 * The properties that matter: an idle-exit fires only after the full window
 * with the count at zero, any activity before expiry cancels it, and a held ref
 * (the panel) keeps the daemon alive no matter how much time passes.
 */
import { describe, expect, it, vi } from "vitest";

import { Lifecycle, type TimerHandle } from "../src/lifecycle.js";

/** A scheduler we drive by hand: `advance(ms)` fires everything now due. */
function fakeTimers() {
  let seq = 0;
  let clock = 0;
  const timers = new Map<number, { fn: () => void; due: number }>();
  return {
    setTimer: (fn: () => void, ms: number): TimerHandle => {
      seq += 1;
      timers.set(seq, { fn, due: clock + ms });
      return seq;
    },
    clearTimer: (handle: TimerHandle): void => {
      timers.delete(handle as number);
    },
    advance: (ms: number): void => {
      clock += ms;
      for (const [id, t] of [...timers]) {
        if (t.due <= clock) {
          timers.delete(id);
          t.fn();
        }
      }
    },
    pending: (): number => timers.size,
  };
}

const IDLE = 1000;

function makeLifecycle(timers: ReturnType<typeof fakeTimers>) {
  const onIdle = vi.fn();
  const lc = new Lifecycle({
    idleMs: IDLE,
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
    onIdle,
  });
  return { lc, onIdle };
}

describe("Lifecycle idle timeout", () => {
  it("fires onIdle only after the full window with zero refs", () => {
    const timers = fakeTimers();
    const { lc, onIdle } = makeLifecycle(timers);

    lc.start();
    timers.advance(IDLE - 1);
    expect(onIdle).not.toHaveBeenCalled();

    timers.advance(1);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("cancels the pending exit when a ref is retained before expiry", () => {
    const timers = fakeTimers();
    const { lc, onIdle } = makeLifecycle(timers);

    lc.start();
    timers.advance(IDLE / 2);
    lc.retain();
    expect(lc.refs).toBe(1);
    timers.advance(IDLE * 5);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it("debounces a release → retain → release burst into a single window", () => {
    const timers = fakeTimers();
    const { lc, onIdle } = makeLifecycle(timers);

    lc.retain(); // refs 1 — no timer
    lc.release(); // refs 0 — arm at t=0
    timers.advance(IDLE / 2);
    lc.retain(); // cancels
    lc.release(); // re-arm at t=IDLE/2
    timers.advance(IDLE - 1);
    expect(onIdle).not.toHaveBeenCalled();
    timers.advance(1);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("keeps the daemon alive as long as a ref (the panel) is held", () => {
    const timers = fakeTimers();
    const { lc, onIdle } = makeLifecycle(timers);

    lc.retain(); // panel connected
    expect(timers.pending()).toBe(0);
    lc.bump(); // traffic while the panel is held — still no timer
    timers.advance(IDLE * 100);
    expect(onIdle).not.toHaveBeenCalled();

    lc.release(); // panel gone — now the window arms
    timers.advance(IDLE);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("re-arms the window on a bump when refs are zero (stateless traffic)", () => {
    const timers = fakeTimers();
    const { lc, onIdle } = makeLifecycle(timers);

    lc.start();
    timers.advance(IDLE - 1);
    lc.bump(); // a /mcp POST landed just before expiry — reset
    timers.advance(IDLE - 1);
    expect(onIdle).not.toHaveBeenCalled();
    timers.advance(1);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });
});
