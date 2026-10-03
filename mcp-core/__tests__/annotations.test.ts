import { describe, expect, it } from "vitest";

import {
  READ_ONLY_TOOLS,
  TOOL_TIERS,
  paidToolCost,
  tierOf,
  type ToolTier,
} from "../src/allowlist.js";
import {
  annotationsForTier,
  SCHEMA_VERSION_KEY,
  TOOL_SCHEMA_VERSION,
  withSchemaVersion,
} from "../src/annotations.js";

/** Every name the gate admits — the exact set a host can ever see. */
const ADMITTED: readonly string[] = [
  ...READ_ONLY_TOOLS,
  ...Object.keys(TOOL_TIERS),
];

describe("annotationsForTier", () => {
  // Guards against a second source of truth. Hand-written hints would drift
  // from the gate invisibly: a tool advertised read-only while the gate treats
  // it as destructive still works, it just lies to whoever decides to retry.
  it("covers every admitted tool — no gap between the gate and the hints", () => {
    const missing = ADMITTED.filter(
      (name) => tierOf(name) !== null && !annotationsForTier(name),
    );
    expect(missing).toEqual([]);
  });

  // A name with no tier must produce nothing, or annotations become a second
  // admission list — the server-side allowlist copy this package must not have.
  it("gives nothing for a name the gate does not know", () => {
    expect(annotationsForTier("tool_from_the_future")).toBeUndefined();
  });

  it("agrees with tierOf on every admitted tool", () => {
    for (const name of ADMITTED) {
      const tier = tierOf(name);
      if (tier === null || tier === "naver-write") continue;
      expect(annotationsForTier(name)?.["x-datalab-tier"]).toBe(tier);
    }
  });

  // Read-only membership IS the hint; two ways of stating one fact must
  // never disagree.
  it("marks exactly the read-only set as readOnlyHint", () => {
    for (const name of ADMITTED) {
      const a = annotationsForTier(name);
      if (!a) continue;
      expect(a.readOnlyHint).toBe(tierOf(name) === "read");
    }
  });

  // Mutually exclusive by construction: a tool that both changes nothing and
  // destroys something leaves a host no safe way to act.
  it("never claims a tool is both read-only and destructive", () => {
    for (const name of ADMITTED) {
      const a = annotationsForTier(name);
      if (!a) continue;
      expect(a.readOnlyHint === true && a.destructiveHint === true).toBe(false);
    }
  });

  // Absent and false differ: the MCP default is true, so omitting the hint
  // would advertise a reversible edit as irreversible.
  it("states destructiveHint: false on write rather than omitting it", () => {
    const writes = Object.entries(TOOL_TIERS).filter(([, t]) => t === "write");
    expect(writes.length).toBeGreaterThan(0);
    for (const [name] of writes) {
      expect(annotationsForTier(name)?.destructiveHint).toBe(false);
    }
  });

  it("flags paid tools as open-world, non-idempotent, and states the basis", () => {
    const paid = Object.entries(TOOL_TIERS).filter(([, t]) => t === "paid");
    expect(paid.length).toBeGreaterThan(0);
    for (const [name] of paid) {
      const a = annotationsForTier(name);
      expect(a?.openWorldHint).toBe(true);
      expect(a?.idempotentHint).toBe(false);
      expect(a?.["x-datalab-cost-basis"]).toBe(paidToolCost(name)?.basis);
    }
  });

  it("calls read-only tools idempotent — asking twice costs nothing", () => {
    expect(annotationsForTier(READ_ONLY_TOOLS[0]!)?.idempotentHint).toBe(true);
  });

  // The closed tier puts no name on the wire, so it has nothing to annotate.
  it("returns nothing for the closed tier", () => {
    const closed = Object.entries(TOOL_TIERS).find(
      ([, t]) => (t as ToolTier) === "naver-write",
    );
    if (closed) expect(annotationsForTier(closed[0])).toBeUndefined();
  });
});

describe("withSchemaVersion", () => {
  it("stamps the version without disturbing the schema", () => {
    const schema = { type: "object", properties: { a: { type: "string" } } };
    const out = withSchemaVersion(schema);
    expect(out[SCHEMA_VERSION_KEY]).toBe(TOOL_SCHEMA_VERSION);
    expect(out.type).toBe("object");
    expect(out.properties).toEqual(schema.properties);
  });

  it("does not mutate its input", () => {
    const schema = { type: "object" };
    withSchemaVersion(schema);
    expect(SCHEMA_VERSION_KEY in schema).toBe(false);
  });
});
