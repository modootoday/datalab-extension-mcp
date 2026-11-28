/**
 * The pairing desk: answers the side panel about which AI apps ask to connect,
 * and carries out its approve, refuse and revoke.
 */
import {
  MIN_TOKEN_LENGTH,
  PairingRequestSchema,
  checkExtensionIdentity,
  normalizeAppName,
  type PairingAnswer,
  type PairingRefusal,
  type PairingStatus,
} from "@modootoday/datalab-extension-app-mcp-core";

import { digestToken } from "../token-digest.js";
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

export interface DeskHooks {
  /** End the profile's live sessions before its record changes. */
  endProfile?: (digest: string) => void;
}

export interface PairingDesk {
  handle(
    raw: unknown,
    origin: string | undefined | null,
    hooks?: DeskHooks,
  ): DeskReply;
}

const REFUSAL_STATUS: Record<PairingRefusal, number> = {
  forbidden_origin: 403,
  unauthorized: 403,
  paired_elsewhere: 403,
  window_closed: 403,
  unknown_app: 404,
  bad_request: 400,
  not_saved: 500,
};

function refuse(reason: PairingRefusal): DeskReply {
  return {
    status: REFUSAL_STATUS[reason],
    answer: { ok: false, reason },
  };
}

export function createPairingDesk(options: PairingDeskOptions): PairingDesk {
  const { root, apps, extensionIds } = options;

  // Any panel may pair at any time, so the window older panels read is open
  // and has no end.
  const statusFor = (yours: boolean): PairingStatus => {
    const paired = root.paired();
    const visible = paired ? yours : true;
    return {
      paired,
      yours,
      windowOpen: root.source === "side_panel",
      windowEndsAt: null,
      pending: visible ? apps.pending() : [],
      apps: paired && yours ? apps.approved() : [],
    };
  };

  return {
    handle(raw, origin, hooks = {}) {
      const parsed = PairingRequestSchema.safeParse(raw);
      if (!parsed.success) return refuse("bad_request");
      const { action, token, extensionId, app } = parsed.data;

      const identity = checkExtensionIdentity(
        origin,
        extensionId,
        extensionIds,
      );
      if (!identity.ok) return refuse("forbidden_origin");

      if (action === "status") {
        const yours = root.paired() && root.matches(token);
        return { status: 200, answer: { ok: true, status: statusFor(yours) } };
      }

      if (token.length < MIN_TOKEN_LENGTH) return refuse("unauthorized");

      if (action === "unpair") {
        if (!root.matches(token)) return refuse("unauthorized");
        // Closed first, so no call routed in between lands on this profile.
        hooks.endProfile?.(digestToken(token));
        const outcome = root.unpair(token);
        if (outcome.kind === "unknown") return refuse("unauthorized");
        if (outcome.kind === "not_saved") return refuse("not_saved");
        options.log?.(
          `unpaired the browser profile ${outcome.label ?? "(no name)"}`,
        );
        return { status: 200, answer: { ok: true, status: statusFor(false) } };
      }

      if (app === undefined) return refuse("bad_request");
      // The hello explains each refusal; here the panel only learns it may not act.
      if (root.enroll(token).kind === "refused") return refuse("unauthorized");

      if (action === "revoke") {
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
        return { status: 200, answer: { ok: true, status: statusFor(true) } };
      }

      apps.approve(app);
      return { status: 200, answer: { ok: true, status: statusFor(true) } };
    },
  };
}
