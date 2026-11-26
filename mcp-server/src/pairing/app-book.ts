/**
 * Which AI apps may use this connector: the ones the user approved, the ones
 * waiting for an answer, and the ones refused during this run.
 */
import {
  normalizeAppName,
  type ApprovedApp,
  type PendingApp,
} from "@modootoday/datalab-extension-app-mcp-core";

import { readApprovedApps, writeApprovedApps } from "./app-store.js";

/** More waiting names than this are dropped, so a flood of names costs nothing. */
const PENDING_CAP = 16;

export type AppStanding = "approved" | "pending" | "refused";

export interface AppBook {
  /** Record that an app called, and say where it stands. */
  see(name: string): AppStanding;
  approved(): ApprovedApp[];
  pending(): PendingApp[];
  /** Approve an app that is waiting. False when no such app waits. */
  approve(name: string): boolean;
  /** Refuse an app that is waiting, for the rest of this run. */
  refuse(name: string): boolean;
  /** Take an approved app back; it asks again on its next call. */
  revoke(name: string): boolean;
}

export interface AppBookOptions {
  home?: string;
  now?: () => number;
  log?: (message: string) => void;
}

export function createAppBook(options: AppBookOptions = {}): AppBook {
  const now = options.now ?? Date.now;
  let approved = readApprovedApps(options.home);
  const pending = new Map<string, number>();
  const refused = new Set<string>();

  const save = (): void => {
    if (writeApprovedApps(approved, options.home)) return;
    options.log?.("could not write the approved apps; kept for this run only");
  };

  return {
    see(raw) {
      const name = normalizeAppName(raw);
      if (name === null) return "refused";
      if (approved.some((app) => app.name === name)) return "approved";
      if (refused.has(name)) return "refused";
      if (!pending.has(name) && pending.size < PENDING_CAP) {
        pending.set(name, now());
      }
      return pending.has(name) ? "pending" : "refused";
    },
    approved: () => approved.map((app) => ({ ...app })),
    pending: () => [...pending].map(([name, askedAt]) => ({ name, askedAt })),
    approve(raw) {
      const name = normalizeAppName(raw);
      if (name === null || !pending.delete(name)) return false;
      approved = [
        ...approved,
        { name, approvedAt: new Date(now()).toISOString() },
      ];
      save();
      return true;
    },
    refuse(raw) {
      const name = normalizeAppName(raw);
      if (name === null || !pending.delete(name)) return false;
      refused.add(name);
      return true;
    },
    revoke(raw) {
      const name = normalizeAppName(raw);
      if (name === null) return false;
      const next = approved.filter((app) => app.name !== name);
      if (next.length === approved.length) return false;
      approved = next;
      refused.delete(name);
      save();
      return true;
    },
  };
}
