/**
 * Handshake authorisation — pure.
 *
 * The extension exposes no listener, so the threat is impersonating the peer
 * it dials. A web page reaching loopback is refused by the identity check (the
 * browser stamps an Origin a page can neither forge nor omit); a local process
 * forging that Origin is refused by the token check. Both are required.
 */

/** The only hosts this bridge binds. Never a wildcard address. */
export const LOOPBACK_HOSTS: readonly string[] = [
  "127.0.0.1",
  "::1",
  "localhost",
];

/**
 * Reject any bind address that is not loopback. Exported so the server can
 * assert this at startup rather than discover it from the LAN later.
 */
export function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.includes(host.trim().toLowerCase());
}

/**
 * Constant-time string compare — a plain equality check would leak the token's
 * prefix through timing to a local process that can retry. The length compare
 * stays early-exit on purpose: token length is not secret.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Minimum pairing-token entropy we will accept, in characters. */
export const MIN_TOKEN_LENGTH = 32;

export type TokenCheck =
  | { ok: true }
  | { ok: false; reason: "unauthorized"; message: string };

/**
 * Verify a presented pairing token against the expected one. Every failure
 * returns one coarse reason — absent, malformed, and wrong are deliberately
 * indistinguishable, so a prober learns nothing about which it hit.
 */
export function checkToken(
  presented: string | undefined | null,
  expected: string,
): TokenCheck {
  const fail: TokenCheck = {
    ok: false,
    reason: "unauthorized",
    message: "Pairing token missing or invalid.",
  };
  if (typeof presented !== "string" || presented.length === 0) return fail;
  if (expected.length < MIN_TOKEN_LENGTH) return fail;
  return timingSafeEqual(presented, expected) ? { ok: true } : fail;
}

export type OriginCheck =
  | { ok: true }
  | { ok: false; reason: "forbidden_origin"; message: string };

/**
 * Verify the Origin header names our extension. The browser stamps Origin on a
 * page's request and the page cannot lie, so this stops a page on loopback —
 * and nothing else, since a non-browser caller is not bound by it. An absent
 * Origin is refused here; the identity check owns that case.
 */
export function checkOrigin(
  origin: string | undefined | null,
  extensionId: string,
): OriginCheck {
  const expected = `chrome-extension://${extensionId}`;
  if (typeof origin !== "string" || origin.length === 0) {
    return {
      ok: false,
      reason: "forbidden_origin",
      message: "Origin header absent; only the paired extension may connect.",
    };
  }
  if (origin !== expected) {
    return {
      ok: false,
      reason: "forbidden_origin",
      message: "Origin is not the paired extension.",
    };
  }
  return { ok: true };
}

/**
 * Verify the peer is our extension: from the Origin header when the browser
 * sent one, otherwise from the id the panel carries in the hello body.
 *
 * 🔴 Origin wins when present, so a page on loopback is refused. The fallback
 * exists because the panel's service worker cannot set Origin at all, and no
 * page reaches that branch. The public body id is only a misconfiguration
 * guard; the token check authenticates.
 */
export function checkExtensionIdentity(
  origin: string | undefined | null,
  claimedExtensionId: string | undefined | null,
  extensionId: string,
): OriginCheck {
  if (typeof origin === "string" && origin.length > 0) {
    return checkOrigin(origin, extensionId);
  }
  if (typeof claimedExtensionId === "string" && claimedExtensionId.length > 0) {
    if (claimedExtensionId === extensionId) return { ok: true };
    return {
      ok: false,
      reason: "forbidden_origin",
      message: "Extension id does not match the paired extension.",
    };
  }
  return {
    ok: false,
    reason: "forbidden_origin",
    message:
      "Origin header absent and no extension id provided; only the paired extension may connect.",
  };
}
