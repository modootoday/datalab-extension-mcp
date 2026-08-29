/**
 * Tool annotations — restating what the tier already knows in the vocabulary a
 * host reads, so a caller can tell a retryable call from an irreversible one.
 *
 * No new judgement here: the only input is the tool's tier. Adding an
 * exposure decision would turn this into a second allowlist that disagrees
 * with the first, and a mismatch between advertisement and gate is silent.
 */
import { paidToolCost, tierOf, type ToolTier } from "./allowlist.js";

/**
 * The four standard MCP hints the spec closes at, plus the vendor fields an
 * auditor reads. Kept in one object so what a host sees and what an audit
 * checks share a source.
 *
 * Hints are advisory in the spec. The real gate is always the tier decision
 * inside the extension; this only advertises it.
 */
export interface McpToolAnnotations {
  /** Reads only, changing nothing. */
  readonly readOnlyHint?: boolean;
  /** Makes a change that cannot be undone. */
  readonly destructiveHint?: boolean;
  /** Same arguments, same outcome on a repeat call. */
  readonly idempotentHint?: boolean;
  /** Reaches something outside our control — billing, an external service. */
  readonly openWorldHint?: boolean;
  /** The tool's tier. Hosts ignore it; auditors check the table against it. */
  readonly "x-datalab-tier"?: ToolTier;
  /** For a paid tier: what the charge is for, in one line. */
  readonly "x-datalab-cost-basis"?: string;
  /**
   * "own" when the call reads the user's own account through their session.
   *
   * An AUDIT field, not an advertisement. The spec's annotation set is closed
   * and off-the-shelf clients drop vendor keys, so no host shows this to anyone.
   * The channel that reaches a person is the description. Do not build policy on
   * a promise this field cannot keep.
   */
  readonly "x-datalab-reads"?: "own";
}

/**
 * Tier to standard hints — the single source, never restated by hand.
 *
 * The write tier states the destructive hint as false explicitly: the MCP
 * default is true, so omitting it advertises a reversible edit as final and
 * earn the user a confirmation prompt they do not need. A closed tier has no
 * entry at all, since its tools never reach a host.
 */
const HINTS_BY_TIER: Readonly<
  Record<Exclude<ToolTier, "naver-write">, McpToolAnnotations>
> = Object.freeze({
  read: Object.freeze({
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  }),
  write: Object.freeze({
    readOnlyHint: false,
    destructiveHint: false,
  }),
  destructive: Object.freeze({
    readOnlyHint: false,
    destructiveHint: true,
  }),
  paid: Object.freeze({
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  }),
});

/**
 * Annotations for this name; undefined when the tier is absent or closed.
 *
 * Undefined rather than an empty object so the caller omits the key entirely:
 * on the wire, "we were not told" must stay distinct from an empty claim.
 */
/**
 * Two facts the tier cannot answer, supplied by the caller that holds the tool.
 *
 * Both spec defaults are the pessimistic reading — open world, not idempotent
 * — so silence here is a claim, and the wrong one for a tool confined to our own
 * canvas or for one that is safe to call twice.
 */
export interface ToolAnnotationFacts {
  /** False when the tool only touches surfaces we own. */
  readonly openWorld?: boolean;
  /** True when calling again with the same arguments compounds. */
  readonly retryUnsafe?: boolean;
  /** "own" when it reads the user's own account rather than public data. */
  readonly sensitivity?: "own";
}

export function annotationsForTier(
  name: string,
  facts: ToolAnnotationFacts = {},
): McpToolAnnotations | undefined {
  const tier = tierOf(name);
  if (tier === null || tier === "naver-write") return undefined;
  const hints = HINTS_BY_TIER[tier];
  const cost = tier === "paid" ? paidToolCost(name) : null;
  const idempotent =
    facts.retryUnsafe === true ? false : (hints.idempotentHint ?? undefined);
  return Object.freeze({
    ...hints,
    ...(facts.openWorld === undefined
      ? {}
      : { openWorldHint: facts.openWorld }),
    ...(idempotent === undefined ? {} : { idempotentHint: idempotent }),
    "x-datalab-tier": tier,
    ...(cost ? { "x-datalab-cost-basis": cost.basis } : {}),
    ...(facts.sensitivity ? { "x-datalab-reads": facts.sensitivity } : {}),
  });
}

/**
 * Annotations for a synthetic lookup tool — one that finds tools rather than
 * being one, so it carries no tier and the derivation cannot answer for it.
 *
 * Never apply this to a tiered tool: hand-attaching hints splits the
 * advertisement from the gate. Never apply it to a dispatcher either — a name
 * it forwards may be destructive, so leaving annotations absent is the truth.
 */
export const LOOKUP_ANNOTATIONS: McpToolAnnotations = Object.freeze({
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
});

/**
 * Shape version of a tool's input schema — a separate axis from the bridge
 * protocol version and from the connector's own semver, and no substitute for
 * either.
 *
 * Rewording a description is not a reason to bump. Only argument names,
 * types, or required-ness move this number.
 */
export const TOOL_SCHEMA_VERSION = 1;

/** The key the schema version travels under on the wire. */
export const SCHEMA_VERSION_KEY = "x-schema-version";

/**
 * Attach the schema version inside the input schema.
 *
 * Inside, not top level: a server re-assembles a descriptor from name,
 * description, and inputSchema only, so a top-level field disappears there
 * without a failure signal. Position is what makes this survive old servers.
 */
export function withSchemaVersion(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  return { ...schema, [SCHEMA_VERSION_KEY]: TOOL_SCHEMA_VERSION };
}
