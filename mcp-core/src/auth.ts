/**
 * Handshake authorisation — pure.
 *
 * Threat model (see the project README). The extension has no listener: an MV3 service worker
 * cannot accept a connection, and `externally_connectable` is not declared. So
 * nothing can reach INTO the extension. The real threat is the inverse —
 * impersonating the peer the extension dials, and reaching the extension's
 * tool surface through it:
 *
 *   (1) A web page opens `http://127.0.0.1:<port>` — WebSocket and fetch carry
 *       no same-origin protection to loopback. Defended by `checkExtensionIdentity`:
 *       the browser stamps `Origin` on a page fetch and a page can neither forge
 *       nor omit it, so a present Origin must name our extension. (Our own panel
 *       dials from a service worker, whose privileged loopback fetch sends NO
 *       Origin — a path a web page can never take — so an absent Origin falls
 *       back to the extension id carried in the hello body.)
 *   (2) A local process forges `Origin` / the body id (trivial with curl).
 *       Defended by `checkToken`: unlike a cookie, a bearer token is not
 *       auto-attached, and the id is public so it is no secret either.
 *
 * Neither defence stops malware already running as the user — it can read the
 * token file. That is the acknowledged limit of any loopback scheme, and
 * native messaging does not escape it either (the binary can be replaced).
 * We defend (1) and (2); we do not claim to defend (3).
 *
 * The prior art here is bad and worth naming: Browser MCP binds `0.0.0.0:9009`
 * with no auth at all — anyone on the LAN drives the browser — and the report
 * was closed "not planned". Do not treat that project as a template.
 *
 */

/** Loopback hosts we will bind. Never `0.0.0.0` — that is the Browser MCP bug. */
export const LOOPBACK_HOSTS: readonly string[] = [
  "127.0.0.1",
  "::1",
  "localhost",
];

/**
 * Reject any bind address that is not loopback.
 *
 * Exported so the server can assert at startup rather than discovering at
 * incident time that it was reachable from the LAN.
 */
export function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.includes(host.trim().toLowerCase());
}

/**
 * Constant-time string compare.
 *
 * A `===` on the token leaks its prefix through timing to any local process
 * that can retry, which is exactly the attacker in threat (2). Length is
 * compared first and non-constant-time on purpose: token length is not secret,
 * and returning early on a length mismatch avoids indexing past the end.
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
 * Verify a presented pairing token against the expected one.
 *
 * Returns a single coarse `unauthorized` for every failure — absent, malformed,
 * and wrong are deliberately indistinguishable to the caller, so a prober
 * learns nothing about which of the three it hit.
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
 * Verify the `Origin` header names our extension.
 *
 * A page at `https://evil.example` opening a socket to loopback gets
 * `Origin: https://evil.example` stamped by the browser — it cannot lie. That
 * makes this a real defence against threat (1), and no defence at all against
 * threat (2), where the attacker is not a browser. Both checks are required;
 * neither is sufficient.
 *
 * `null` / absent Origin is refused rather than waved through: a non-browser
 * client has no business on this socket, and it must prove itself by token via
 * a path that also carries a valid Origin.
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
 * Verify the peer is our extension, from the `Origin` header when the browser
 * sent one, otherwise from the id the panel carries in the hello body.
 *
 * The `Origin` header is authoritative WHEN PRESENT: a browser stamps it on
 * every page fetch and a page can neither forge nor omit it, so a present-but-
 * wrong Origin is threat (1) — a web page on loopback — and is refused. But our
 * own panel dials from a service worker, whose privileged fetch to a granted
 * loopback host carries NO `Origin` (it is a forbidden header the code cannot
 * set), so the header is absent on the ONE path that must succeed. A web page
 * can never reach that absent-Origin branch, so falling back there to the
 * body-carried extension id does not reopen threat (1).
 *
 * The body id is not a secret — the extension id is public — so this is a
 * misconfiguration guard (a wrong `--extension-id`, a stale install), not an
 * authentication factor. Threat (2), a local process forging the body id, is
 * defended by `checkToken`, exactly as it was when the Origin was forgeable.
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
