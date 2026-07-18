import { describe, expect, it } from "vitest";

import { negotiateProtocol } from "../src/negotiate.js";
import {
  BRIDGE_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
} from "../src/protocol.js";

describe("negotiateProtocol", () => {
  it("agrees when both sides speak the current version", () => {
    expect(negotiateProtocol([BRIDGE_PROTOCOL_VERSION])).toEqual({
      ok: true,
      version: BRIDGE_PROTOCOL_VERSION,
    });
  });

  // Highest-common, not newest-offered: an extension that learns v3 must still
  // work against a server stuck on v1, which is the common direction of skew.
  it("picks the highest version both sides speak", () => {
    expect(negotiateProtocol([1, 2, 3], [1, 2])).toEqual({
      ok: true,
      version: 2,
    });
  });

  it("ignores versions only one side speaks", () => {
    expect(negotiateProtocol([1, 5], [1, 9])).toEqual({ ok: true, version: 1 });
  });

  it("fails with no common version", () => {
    const out = negotiateProtocol([9], [1]);
    expect(out).toMatchObject({
      ok: false,
      reason: "version_mismatch",
      supported: [1],
    });
  });

  // The message is the whole point of negotiating: it must name which side to
  // update, or the user is left diffing two arrays.
  it("blames the server when the extension is ahead", () => {
    const out = negotiateProtocol([5], [1]);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.message).toMatch(/server is out of date/i);
  });

  it("blames the extension when the server is ahead", () => {
    const out = negotiateProtocol([1], [5]);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.message).toMatch(/extension is out of date/i);
  });

  it("reports what the server supports so the caller can act", () => {
    const out = negotiateProtocol([9], [1, 2]);
    if (!out.ok) expect(out.supported).toEqual([1, 2]);
  });

  it("returns a copy of `supported`, not the module's own array", () => {
    const out = negotiateProtocol([9]);
    if (!out.ok) {
      out.supported.push(99);
      expect(SUPPORTED_PROTOCOL_VERSIONS).not.toContain(99);
    }
  });

  it("handles an empty offer without throwing", () => {
    const out = negotiateProtocol([], [1]);
    expect(out).toMatchObject({ ok: false, reason: "version_mismatch" });
  });

  it("handles an empty supported set without throwing", () => {
    const out = negotiateProtocol([1], []);
    expect(out).toMatchObject({
      ok: false,
      reason: "version_mismatch",
      supported: [],
    });
  });
});
