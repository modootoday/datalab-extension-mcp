/**
 * The pairing desk: answers the side panel about which AI apps ask to connect,
 * and carries out its approve, refuse and revoke.
 */
import {
  MIN_TOKEN_LENGTH,
  PairingRequestSchema,
  checkExtensionIdentity,
  checkToken,
  normalizeAppName,
  type PairingAnswer,
  type PairingRefusal,
  type PairingStatus,
} from "@modootoday/datalab-extension-app-mcp-core";

import type { AppBook } from "./app-book.js";
import type { RootCredential } from "./root-credential.js";

export interface PairingDeskOptions {
  root: RootCredential;
  apps: AppBook;
  extensionIds: readonly string[];
  log?: (message: string) => void;
}

export interface DeskReply {
  status: number;
  answer: PairingAnswer;
}

export interface PairingDesk {
  handle(raw: unknown, origin: string | undefined | null): DeskReply;
}

const REFUSAL_STATUS: Record<PairingRefusal, number> = {
  forbidden_origin: 403,
  unauthorized: 403,
  paired_elsewhere: 403,
  window_closed: 403,
  unknown_app: 404,
  bad_request: 400,
};

function refuse(reason: PairingRefusal): DeskReply {
  return {
    status: REFUSAL_STATUS[reason],
    answer: { ok: false, reason },
  };
}

export function createPairingDesk(options: PairingDeskOptions): PairingDesk {
  const { root, apps, extensionIds } = options;

  const statusFor = (yours: boolean): PairingStatus => {
    const held = root.current();
    const paired = held !== null;
    const windowOpen = root.acceptsClaim();
    const visible = paired ? yours : true;
    return {
      paired,
      yours,
      windowOpen,
      windowEndsAt: root.windowEndsAt(),
      pending: visible ? apps.pending() : [],
      apps: paired && yours ? apps.approved() : [],
    };
  };

  return {
    handle(raw, origin) {
      const parsed = PairingRequestSchema.safeParse(raw);
      if (!parsed.success) return refuse("bad_request");
      const { action, token, extensionId, app } = parsed.data;

      const identity = checkExtensionIdentity(
        origin,
        extensionId,
        extensionIds,
      );
      if (!identity.ok) return refuse("forbidden_origin");

      const held = root.current();
      const yours = held !== null && checkToken(token, held).ok;
      if (action === "status") {
        return { status: 200, answer: { ok: true, status: statusFor(yours) } };
      }

      if (held !== null && !yours) return refuse("paired_elsewhere");
      if (held === null && token.length < MIN_TOKEN_LENGTH) {
        return refuse("unauthorized");
      }
      if (app === undefined) return refuse("bad_request");

      if (action === "revoke") {
        if (held === null) return refuse("unauthorized");
        if (!apps.revoke(app)) return refuse("unknown_app");
        options.log?.("an approved AI app was revoked");
        return { status: 200, answer: { ok: true, status: statusFor(true) } };
      }

      const name = normalizeAppName(app);
      if (!apps.pending().some((entry) => entry.name === name)) {
        return refuse("unknown_app");
      }
      if (action === "refuse") {
        apps.refuse(app);
        return {
          status: 200,
          answer: { ok: true, status: statusFor(held !== null) },
        };
      }

      if (held === null) {
        if (!root.acceptsClaim()) return refuse("window_closed");
        if (root.claim(token) !== "claimed") return refuse("unauthorized");
        options.log?.("paired with a side panel");
      }
      apps.approve(app);
      return { status: 200, answer: { ok: true, status: statusFor(true) } };
    },
  };
}
