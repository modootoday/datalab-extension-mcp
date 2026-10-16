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

type BytesEqual = (a: Uint8Array, b: Uint8Array) => boolean;

interface RuntimeGlobals {
  crypto?: { subtle?: { timingSafeEqual?: BytesEqual } };
  process?: {
    getBuiltinModule?: (
      id: string,
    ) => { timingSafeEqual?: BytesEqual } | undefined;
  };
}

let nativeEqual: BytesEqual | undefined;

/**
 * The runtime's own timing-safe comparison: crypto.subtle on Workers,
 * node:crypto on Node and Bun. A runtime with neither cannot verify a token.
 */
function resolveNativeEqual(): BytesEqual {
  if (nativeEqual) return nativeEqual;
  const g = globalThis as RuntimeGlobals;
  const subtle = g.crypto?.subtle;
  if (typeof subtle?.timingSafeEqual === "function") {
    nativeEqual = (a, b) => subtle.timingSafeEqual!(a, b);
    return nativeEqual;
  }
  const nodeCrypto = g.process?.getBuiltinModule?.("node:crypto");
  if (typeof nodeCrypto?.timingSafeEqual === "function") {
    nativeEqual = nodeCrypto.timingSafeEqual;
    return nativeEqual;
  }
  throw new Error("No native timing-safe comparison in this runtime.");
}

/**
 * Constant-time string compare through the runtime's native primitive — a
 * plain equality check would leak the token's prefix through timing to a local
 * process that can retry. Token length is not secret, so it is checked first.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const equal = resolveNativeEqual();
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  return equal(left, right);
}

/** Minimum pairing-token entropy we will accept, in characters. */
export const MIN_TOKEN_LENGTH = 32;

export type TokenCheck =
  { ok: true } | { ok: false; reason: "unauthorized"; message: string };

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
  { ok: true } | { ok: false; reason: "forbidden_origin"; message: string };

/**
 * Verify the Origin header names our extension. The browser stamps Origin on a
 * page's request and the page cannot lie, so this stops a page on loopback —
 * and nothing else, since a non-browser caller is not bound by it. An absent
 * Origin is refused here; the identity check owns that case.
 */
export function checkOrigin(
  origin: string | undefined | null,
  extensionIds: readonly string[],
): OriginCheck {
  if (typeof origin !== "string" || origin.length === 0) {
    return {
      ok: false,
      reason: "forbidden_origin",
      message: "Origin header absent; only the paired extension may connect.",
    };
  }
  // Whole-string equality against each, never a prefix or a pattern. An
  // origin that merely contains a paired id is a different origin, and an
  // empty list matches nothing — which is the answer a bridge paired with
  // nobody should give.
  const matched = extensionIds.some(
    (id) => origin === `chrome-extension://${id}`,
  );
  if (!matched) {
    return {
      ok: false,
      reason: "forbidden_origin",
      message: "Origin is not the paired extension.",
    };
  }
  return { ok: true };
}

/**
 * Verify the peer is an extension this bridge was paired with: from the Origin
 * header when the browser sent one, otherwise from the id the panel carries in
 * the hello body.
 *
 * Origin wins when present, so a page on loopback is refused. The fallback
 * exists because the panel's service worker cannot set Origin at all, and no
 * page reaches that branch. The public body id is only a misconfiguration
 * guard; the token check authenticates.
 */
export function checkExtensionIdentity(
  origin: string | undefined | null,
  claimedExtensionId: string | undefined | null,
  extensionIds: readonly string[],
): OriginCheck {
  if (typeof origin === "string" && origin.length > 0) {
    return checkOrigin(origin, extensionIds);
  }
  if (typeof claimedExtensionId === "string" && claimedExtensionId.length > 0) {
    if (extensionIds.includes(claimedExtensionId)) return { ok: true };
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
