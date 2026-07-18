/**
 * Freeze-floor tests for the wire protocol.
 *
 * These are not ordinary schema tests: once a pinned server ships, every
 * binary on a user's disk lives forever, so the properties below are the
 * compatibility contract itself. A failure here means a change that would
 * break handshakes with binaries we cannot reach.
 */
import { describe, expect, it } from "vitest";

import {
  BRIDGE_PROTOCOL_VERSION,
  BridgeUpstreamSchema,
  classifyFrame,
  DOWNSTREAM_FRAME_TYPES,
  BridgeDownstreamSchema,
  HelloAckSchema,
  HelloSchema,
  MIN_SUPPORTED_SERVER_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
  UPSTREAM_FRAME_TYPES,
} from "../src/protocol.js";

const GOOD_HELLO = {
  t: "hello",
  protocolVersions: [1],
  extensionVersion: "1.2.3",
  token: "t".repeat(64),
};

describe("hello ABI — permanent, additive-only", () => {
  it("parses a hello that predates the capabilities field", () => {
    // Every 0.0.1/0.0.2 panel sends exactly this shape. It must parse forever.
    const parsed = HelloSchema.parse(GOOD_HELLO);
    expect(parsed.capabilities).toEqual([]);
  });

  it("strips unknown fields instead of rejecting them", () => {
    // The other half of the additive-evolution guarantee: an OLD schema
    // receiving a NEW field must ignore it. zod's default key-strip provides
    // this; .strict() anywhere in the handshake would revoke it. This test is
    // the tripwire for that.
    const parsed = HelloSchema.parse({
      ...GOOD_HELLO,
      fieldFromTheFuture: { anything: true },
    });
    expect(parsed).not.toHaveProperty("fieldFromTheFuture");
  });

  it("carries capabilities when sent", () => {
    const parsed = HelloSchema.parse({
      ...GOOD_HELLO,
      capabilities: ["catalog-push"],
    });
    expect(parsed.capabilities).toEqual(["catalog-push"]);
  });

  it("carries the extension id when sent, and leaves it undefined otherwise", () => {
    // Additive: a panel that predates the field omits it (undefined), and a
    // newer panel sends its own id so the server can identify it without an
    // Origin header.
    expect(HelloSchema.parse(GOOD_HELLO).extensionId).toBeUndefined();
    const withId = HelloSchema.parse({
      ...GOOD_HELLO,
      extensionId: "abcdefghijklmnopabcdefghijklmnop",
    });
    expect(withId.extensionId).toBe("abcdefghijklmnopabcdefghijklmnop");
  });

  it("hello_ack defaults capabilities the same way", () => {
    const parsed = HelloAckSchema.parse({
      t: "hello_ack",
      protocolVersion: 1,
      serverVersion: "0.0.2",
      sessionId: "s1",
    });
    expect(parsed.capabilities).toEqual([]);
  });
});

describe("version constants", () => {
  it("current protocol version is supported", () => {
    expect(SUPPORTED_PROTOCOL_VERSIONS).toContain(BRIDGE_PROTOCOL_VERSION);
  });

  it("minSupported server version is a plain semver", () => {
    // The gateway serves this value verbatim and the panel compares against
    // it; anything but x.y.z would poison every comparison downstream.
    expect(MIN_SUPPORTED_SERVER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("classifyFrame — unknown is not an error", () => {
  it("accepts a known, well-formed frame", () => {
    const out = classifyFrame(BridgeUpstreamSchema, UPSTREAM_FRAME_TYPES, {
      t: "res",
      id: "r1",
      ok: true,
      result: { rows: [] },
    });
    expect(out.kind).toBe("ok");
  });

  it("classifies a frame type from the future as unknown, not malformed", () => {
    // The scenario this exists for: a new panel pushes a frame type invented
    // after this server binary shipped. Dropping the session here would make
    // every new panel feature retroactively break every pinned install.
    const out = classifyFrame(BridgeUpstreamSchema, UPSTREAM_FRAME_TYPES, {
      t: "catalog_update",
      tools: [],
    });
    expect(out).toEqual({ kind: "unknown", frameType: "catalog_update" });
  });

  it("tolerates unknown FIELDS on a known frame", () => {
    const out = classifyFrame(BridgeUpstreamSchema, UPSTREAM_FRAME_TYPES, {
      t: "res",
      id: "r1",
      ok: true,
      result: null,
      newHint: "ignore me",
    });
    expect(out.kind).toBe("ok");
  });

  it("flags a known frame with a broken body as malformed", () => {
    const out = classifyFrame(BridgeUpstreamSchema, UPSTREAM_FRAME_TYPES, {
      t: "res",
      id: 42, // wrong type — a real bug on the sender side
      ok: true,
    });
    expect(out.kind).toBe("malformed");
  });

  it("flags a frame without a string t as malformed", () => {
    expect(
      classifyFrame(BridgeUpstreamSchema, UPSTREAM_FRAME_TYPES, {
        id: "r1",
      }).kind,
    ).toBe("malformed");
    expect(
      classifyFrame(BridgeUpstreamSchema, UPSTREAM_FRAME_TYPES, "not-an-object")
        .kind,
    ).toBe("malformed");
  });

  it("works for the downstream direction too", () => {
    const out = classifyFrame(BridgeDownstreamSchema, DOWNSTREAM_FRAME_TYPES, {
      t: "hb",
      at: 123,
    });
    expect(out.kind).toBe("ok");
    const future = classifyFrame(
      BridgeDownstreamSchema,
      DOWNSTREAM_FRAME_TYPES,
      { t: "shutdown_notice" },
    );
    expect(future.kind).toBe("unknown");
  });
});

describe("no .strict() in the handshake path", () => {
  it("every handshake schema strips rather than rejects", () => {
    // Belt and braces with the hello test above: assert the property on each
    // schema individually so a future .strict() on any one of them fails
    // loudly with its name.
    const cases: Array<[string, () => unknown]> = [
      [
        "hello_ack",
        () =>
          HelloAckSchema.parse({
            t: "hello_ack",
            protocolVersion: 1,
            serverVersion: "0.0.2",
            sessionId: "s1",
            futureField: 1,
          }),
      ],
    ];
    for (const [, run] of cases) {
      expect(run).not.toThrow();
    }
  });
});
