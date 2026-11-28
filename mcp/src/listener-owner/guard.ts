/**
 * Checks the port's owner before a call leaves this adapter. An own verdict is
 * kept only while the daemon's notification stream stays open: its end is how
 * a daemon exit shows here, so without a stream every call is measured.
 */
import type { ListenerMeasure } from "./measure.js";

export const PORT_HELD_MESSAGE =
  "The connector port on this computer is held by a program of another OS account, so nothing was sent to it. Ask the user to quit the AI apps running under the other account, or sign that account out, then try again.";

export class PortHeldByOtherAccount extends Error {
  constructor() {
    super(PORT_HELD_MESSAGE);
    this.name = "PortHeldByOtherAccount";
  }
}

export interface ListenerGuard {
  /** Throws PortHeldByOtherAccount when another account owns the listener. */
  verify(): Promise<void>;
  /** The notification stream opened; an own verdict may now be kept. */
  streamOpened(): void;
  /** The daemon may have changed; measure again before the next call. */
  forget(): void;
}

export function createListenerGuard(
  measure: () => Promise<ListenerMeasure>,
): ListenerGuard {
  let trusted = false;
  let streamOpen = false;
  /** Bumped on every forget, so a measurement that straddles one is not kept. */
  let epoch = 0;
  let pending: {
    readonly epoch: number;
    readonly verdict: Promise<ListenerMeasure>;
  } | null = null;
  return {
    async verify() {
      if (trusted) return;
      if (pending === null || pending.epoch !== epoch) {
        const started = { epoch, verdict: measure() };
        pending = started;
        void started.verdict
          .finally(() => {
            if (pending === started) pending = null;
          })
          .catch(() => {});
      }
      const joined = pending;
      const verdict = await joined.verdict;
      if (verdict.kind === "other") throw new PortHeldByOtherAccount();
      if (verdict.kind !== "own") return;
      trusted = streamOpen && epoch === joined.epoch;
    },
    streamOpened() {
      streamOpen = true;
    },
    forget() {
      epoch += 1;
      trusted = false;
      streamOpen = false;
    },
  };
}
