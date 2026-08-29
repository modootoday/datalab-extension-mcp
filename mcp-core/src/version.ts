/**
 * Semver, stated once.
 *
 * Two implementations existed and disagreed on garbage: one answered "older is
 * false", the other answered "equal" — and the second sat under a floor check,
 * where equal means accepted. A comparison that cannot answer now says so.
 */

/** The only shape any surface here accepts: three plain numbers. */
export const SEMVER_RE = /^\d+\.\d+\.\d+$/;

export function isSemver(value: unknown): value is string {
  return typeof value === "string" && SEMVER_RE.test(value);
}

/**
 * -1 / 0 / 1, or null when either side is not a plain semver.
 *
 * Null rather than a number because every caller is deciding something —
 * refuse a pin, replace a daemon — and folding "cannot tell" into "equal"
 * decides it for them, in the direction that changes nothing.
 */
export function compareSemver(a: unknown, b: unknown): -1 | 0 | 1 | null {
  if (!isSemver(a) || !isSemver(b)) return null;
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}

/** True only when both parse and `a` is strictly older. */
export function isOlderVersion(a: unknown, b: unknown): boolean {
  return compareSemver(a, b) === -1;
}
