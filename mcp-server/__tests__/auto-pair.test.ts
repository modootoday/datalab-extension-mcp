import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Bridge } from "../src/bridge.js";
import { resolveConfig } from "../src/config.js";
import {
  MAX_RECORD_BYTES,
  PROFILE_ADDS_PER_MINUTE,
  createProfileBook,
  fixedRoot,
  forgetAllPairings,
  pairingPath,
  pairingRoot,
  profilesPath,
  readPairingRecord,
  readProfiles,
  writeProfiles,
} from "../src/pairing/index.js";
import { digestToken } from "../src/token-digest.js";
import {
  PUBLISHED_EXTENSION_ID,
  REQUIRED_BROWSER_CAPABILITIES,
} from "@modootoday/datalab-extension-app-mcp-core";

const EXT_ID = "abcdefghijklmnopabcdefghijklmnop";
const ORIGIN = `chrome-extension://${EXT_ID}`;
const FIRST = "a".repeat(64);
const SECOND = "b".repeat(64);
const THIRD = "c".repeat(64);

let home: string;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "datalab-pairing-"));
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
});

const hello = (token: string, browserId = "laptop"): unknown => ({
  t: "hello",
  protocolVersions: [1],
  extensionVersion: "1.1.32",
  token,
  extensionId: EXT_ID,
  browserId,
  capabilities: [...REQUIRED_BROWSER_CAPABILITIES],
});

function bridgeWith(root: ReturnType<typeof pairingRoot>): Bridge {
  return new Bridge({
    send: () => true,
    root,
    extensionIds: [EXT_ID],
    serverVersion: "1.0.0-test",
    log: () => {},
  });
}

const forgedKey = (i: number): string => `forged-${i}-`.padEnd(64, "x");

describe("auto-pair", () => {
  it("the first panel pairs and the single-pairing file keeps its key for older builds", () => {
    const bridge = bridgeWith(pairingRoot({ home }));
    expect(bridge.handshake(hello(FIRST), ORIGIN).t).toBe("hello_ack");
    expect(readPairingRecord(home)?.token).toBe(FIRST);
  });

  it("a second and a third profile each pair on their first hello and stream side by side", () => {
    const bridge = bridgeWith(pairingRoot({ home }));
    for (const [key, id] of [
      [FIRST, "whale"],
      [SECOND, "chrome"],
      [THIRD, "edge"],
    ] as const) {
      const ack = bridge.handshake(hello(key, id), ORIGIN);
      expect(ack.t).toBe("hello_ack");
      if (ack.t !== "hello_ack") return;
      expect(bridge.activateSession(id, ack.sessionId)).toBe(true);
    }
    expect(bridge.connectedBrowsers()).toHaveLength(3);
    expect(readPairingRecord(home)?.token).toBe(FIRST);
  });

  it("a browser id bound to one profile is refused with another key and adds nothing", () => {
    const bridge = bridgeWith(pairingRoot({ home }));
    bridge.handshake(hello(FIRST, "laptop"), ORIGIN);
    expect(bridge.handshake(hello(SECOND, "laptop"), ORIGIN)).toMatchObject({
      t: "hello_nack",
      reason: "paired_elsewhere",
    });
    const read = readProfiles(home);
    expect(read.kind === "ready" && read.profiles.length).toBe(1);
  });

  it("every profile stays paired after a restart", () => {
    const first = bridgeWith(pairingRoot({ home }));
    first.handshake(hello(FIRST, "whale"), ORIGIN);
    first.handshake(hello(SECOND, "chrome"), ORIGIN);
    const restarted = bridgeWith(pairingRoot({ home }));
    expect(restarted.handshake(hello(FIRST, "whale"), ORIGIN).t).toBe(
      "hello_ack",
    );
    expect(restarted.handshake(hello(SECOND, "chrome"), ORIGIN).t).toBe(
      "hello_ack",
    );
  });

  it("refuses a wrong origin, a page and an opaque origin, and pairs nothing", () => {
    const bridge = bridgeWith(pairingRoot({ home }));
    for (const origin of [
      "https://example.com",
      "null",
      "chrome-extension://other",
    ]) {
      expect(bridge.handshake(hello(FIRST), origin)).toMatchObject({
        t: "hello_nack",
        reason: "forbidden_origin",
      });
    }
    expect(readPairingRecord(home)).toBeNull();
    expect(readProfiles(home).kind).toBe("absent");
  });

  it("a handshake that names no browser, or an outdated panel, pairs nothing", () => {
    const bridge = bridgeWith(pairingRoot({ home }));
    const nameless = { ...(hello(FIRST) as object), browserId: undefined };
    const outdated = { ...(hello(FIRST) as object), capabilities: [] };
    expect(bridge.handshake(nameless, ORIGIN).t).toBe("hello_nack");
    expect(bridge.handshake(outdated, ORIGIN).t).toBe("hello_nack");
    expect(readProfiles(home).kind).toBe("absent");
  });

  it("refuses a short key and stays unpaired", () => {
    const root = pairingRoot({ home });
    expect(root.enroll("short")).toEqual({
      kind: "refused",
      reason: "unauthorized",
    });
    expect(root.paired()).toBe(false);
  });

  it.skipIf(process.platform === "win32")(
    "stores both records readable by their owner only",
    () => {
      pairingRoot({ home }).enroll(FIRST);
      expect(statSync(pairingPath(home)).mode & 0o777).toBe(0o600);
      expect(statSync(profilesPath(home)).mode & 0o777).toBe(0o600);
    },
  );

  it("after unpair the next hello pairs again", () => {
    pairingRoot({ home }).enroll(FIRST);
    expect(forgetAllPairings(home)).toBe(true);
    expect(pairingRoot({ home }).enroll(SECOND).kind).toBe("known");
  });

  it("a fixed token adds no profile and writes nothing", () => {
    const root = fixedRoot(FIRST);
    expect(root.enroll(SECOND)).toEqual({
      kind: "refused",
      reason: "unauthorized",
    });
    expect(readPairingRecord(home)).toBeNull();
  });

  it("only the environment token authorises; a profile key never does", () => {
    const root = pairingRoot({ home });
    root.enroll(FIRST);
    expect(root.matches(FIRST)).toBe(true);
    expect(root.authorizes(FIRST)).toBe(false);
    expect(fixedRoot(FIRST).authorizes(FIRST)).toBe(true);
  });
});

describe("a flood of forged hellos", () => {
  it("adds at most the per-minute number of profiles and then refuses as busy", () => {
    let now = 1_000;
    const bridge = bridgeWith(pairingRoot({ home, now: () => now }));
    for (let i = 0; i < PROFILE_ADDS_PER_MINUTE; i += 1) {
      expect(bridge.handshake(hello(forgedKey(i), `b-${i}`), ORIGIN).t).toBe(
        "hello_ack",
      );
    }
    expect(
      bridge.handshake(hello(forgedKey(99), "b-99"), ORIGIN),
    ).toMatchObject({ t: "hello_nack", reason: "pairing_busy" });
    now += 60_001;
    expect(bridge.handshake(hello(forgedKey(99), "b-99"), ORIGIN).t).toBe(
      "hello_ack",
    );
  });

  it("10k forged hellos leave the real profiles admitted and the record readable and under its cap", () => {
    const bridge = bridgeWith(pairingRoot({ home }));
    bridge.handshake(hello(FIRST, "whale"), ORIGIN);
    for (let i = 0; i < 10_000; i += 1) {
      bridge.handshake(hello(forgedKey(i), `forged-${i}`), ORIGIN);
    }
    expect(statSync(profilesPath(home)).size).toBeLessThanOrEqual(
      MAX_RECORD_BYTES,
    );
    expect(readProfiles(home).kind).toBe("ready");
    const restarted = bridgeWith(pairingRoot({ home }));
    expect(restarted.handshake(hello(FIRST, "whale"), ORIGIN).t).toBe(
      "hello_ack",
    );
  });

  it("a record at its cap refuses a new profile as full and keeps every existing one", () => {
    const pairedAt = new Date(0).toISOString();
    const entry = (i: number) => ({
      digest: digestToken(forgedKey(i)),
      pairedAt,
      browserIds: [] as string[],
    });
    const perEntry = JSON.stringify(entry(0)).length + 1;
    const profiles = [
      { digest: digestToken(FIRST), pairedAt, browserIds: ["whale"] },
      ...Array.from(
        { length: Math.ceil(MAX_RECORD_BYTES / perEntry) + 2 },
        (_, i) => entry(i),
      ),
    ];
    while (writeProfiles(profiles, home) !== "written") profiles.pop();
    expect(pairingRoot({ home }).enroll(SECOND)).toEqual({
      kind: "refused",
      reason: "record_full",
    });
    expect(statSync(profilesPath(home)).size).toBeLessThanOrEqual(
      MAX_RECORD_BYTES,
    );
    const restarted = bridgeWith(pairingRoot({ home }));
    expect(restarted.handshake(hello(FIRST, "whale"), ORIGIN).t).toBe(
      "hello_ack",
    );
    expect(restarted.handshake(hello(SECOND, "new"), ORIGIN)).toMatchObject({
      t: "hello_nack",
      reason: "record_full",
    });
  });
});

describe("revoke sticks", () => {
  it("a revoked key is refused, also after a restart, until unpair clears the record", () => {
    const root = pairingRoot({ home });
    root.enroll(FIRST);
    const book = createProfileBook({ home });
    expect(book.revoke(digestToken(FIRST))).toBe(true);
    const restarted = bridgeWith(pairingRoot({ home }));
    expect(restarted.handshake(hello(FIRST, "whale"), ORIGIN)).toMatchObject({
      t: "hello_nack",
      reason: "revoked",
    });
    expect(restarted.handshake(hello(SECOND, "whale"), ORIGIN).t).toBe(
      "hello_ack",
    );
    forgetAllPairings(home);
    expect(pairingRoot({ home }).enroll(FIRST).kind).toBe("known");
  });

  it("revoked digests count inside the cap: a write that would pass it is refused and leaves the file", () => {
    pairingRoot({ home }).enroll(FIRST);
    const before = readProfiles(home);
    const revoked = Array.from({ length: 20_000 }, (_, i) =>
      digestToken(forgedKey(i)),
    );
    expect(writeProfiles([], home, revoked)).toBe("too_large");
    expect(readProfiles(home)).toEqual(before);
  });
});

describe("configuration without a token", () => {
  it("resolves with no token and the published extension id", () => {
    const outcome = resolveConfig({});
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.config.token).toBeNull();
    expect(outcome.config.extensionIds).toEqual([PUBLISHED_EXTENSION_ID]);
  });

  it("still refuses a token that is too short", () => {
    expect(resolveConfig({ DATALAB_MCP_TOKEN: "short" }).ok).toBe(false);
  });
});
