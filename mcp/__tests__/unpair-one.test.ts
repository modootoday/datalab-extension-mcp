import { describe, expect, it, vi } from "vitest";

import {
  pickProfile,
  runList,
  runUnpairOne,
  type PairedProfile,
  type ProfilesView,
} from "../src/pairing/profiles.js";

const WORK: PairedProfile = {
  digest: "d1",
  pairedAt: "2026-11-20T01:00:00.000Z",
  label: "업무",
};
const HOME: PairedProfile = {
  digest: "d2",
  pairedAt: "2026-11-21T01:00:00.000Z",
  label: "개인",
};
const TWIN: PairedProfile = {
  digest: "d3",
  pairedAt: "2026-11-22T01:00:00.000Z",
  label: "업무",
};
const ready =
  (...profiles: PairedProfile[]): (() => ProfilesView) =>
  () => ({
    kind: "ready",
    profiles,
  });

describe("pickProfile", () => {
  it("picks by list number or by a name only one profile has", () => {
    expect(pickProfile([WORK, HOME], "2")).toEqual({
      kind: "one",
      profile: HOME,
    });
    expect(pickProfile([WORK, HOME], "개인")).toEqual({
      kind: "one",
      profile: HOME,
    });
    expect(pickProfile([WORK, HOME], "3")).toEqual({ kind: "none" });
    expect(pickProfile([WORK, HOME, TWIN], "업무")).toEqual({
      kind: "ambiguous",
      numbers: [1, 3],
    });
  });
});

describe("list", () => {
  it("numbers each profile with its name and pairing date", () => {
    const lines: string[] = [];
    expect(
      runList({ read: ready(WORK, HOME), print: (l) => lines.push(l) }),
    ).toBe(0);
    expect(lines.slice(0, 2)).toEqual([
      "1. 업무 · 2026-11-20 연결",
      "2. 개인 · 2026-11-21 연결",
    ]);
  });

  it("says when nothing is paired", () => {
    const lines: string[] = [];
    runList({ read: () => ({ kind: "absent" }), print: (l) => lines.push(l) });
    expect(lines.join("\n")).toContain("연결된 브라우저 프로필이 없어요");
  });
});

describe("unpair one profile", () => {
  it("stops the connector, then forgets only the named profile", async () => {
    const order: string[] = [];
    const lines: string[] = [];
    const code = await runUnpairOne({
      target: "개인",
      read: ready(WORK, HOME),
      stopDaemon: async () => {
        order.push("stop");
        return "stopped";
      },
      revoke: (digest) => {
        order.push(`revoke ${digest}`);
        return true;
      },
      print: (l) => lines.push(l),
    });
    expect(code).toBe(0);
    expect(order).toEqual(["stop", "revoke d2"]);
    expect(lines.join("\n")).toContain("개인 프로필을 해제했어요");
  });

  it("refuses a name two profiles share and lists them by number", async () => {
    const revoke = vi.fn();
    const lines: string[] = [];
    const code = await runUnpairOne({
      target: "업무",
      read: ready(WORK, HOME, TWIN),
      stopDaemon: async () => "stopped",
      revoke,
      print: (l) => lines.push(l),
    });
    expect(code).toBe(1);
    expect(revoke).not.toHaveBeenCalled();
    expect(lines).toContain("1. 업무 · 2026-11-20 연결");
    expect(lines).toContain("3. 업무 · 2026-11-22 연결");
  });

  it("changes nothing when the running connector refuses to stop", async () => {
    const revoke = vi.fn();
    const code = await runUnpairOne({
      target: "1",
      read: ready(WORK),
      stopDaemon: async () => "refused",
      revoke,
      print: () => {},
    });
    expect(code).toBe(1);
    expect(revoke).not.toHaveBeenCalled();
  });

  it("says the unpair did not stick when the record was not written", async () => {
    const lines: string[] = [];
    const code = await runUnpairOne({
      target: "1",
      read: ready(WORK),
      stopDaemon: async () => "not_running",
      revoke: () => false,
      print: (l) => lines.push(l),
    });
    expect(code).toBe(1);
    expect(lines.join("\n")).toContain("해제되지 않았어요");
  });
});
