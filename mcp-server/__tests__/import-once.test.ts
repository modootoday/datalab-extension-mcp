import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { REQUIRED_BROWSER_CAPABILITIES } from "@modootoday/datalab-extension-app-mcp-core";

import { Bridge } from "../src/bridge.js";
import {
  createProfileBook,
  pairingRoot,
  profilesPath,
  readPairingRecord,
  readProfiles,
  writePairingRecord,
  writeProfiles,
} from "../src/pairing/index.js";
import { digestToken } from "../src/token-digest.js";

const EXT_ID = "abcdefghijklmnopabcdefghijklmnop";
const ORIGIN = `chrome-extension://${EXT_ID}`;
const KEY_A = "a".repeat(64);
const KEY_B = "b".repeat(64);
const PAIRED_AT = "2026-11-01T00:00:00.000Z";

let home: string;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "datalab-import-"));
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
});

const hello = (token: string, browserId: string): unknown => ({
  t: "hello",
  protocolVersions: [1],
  extensionVersion: "1.1.32",
  token,
  extensionId: EXT_ID,
  browserId,
  capabilities: [...REQUIRED_BROWSER_CAPABILITIES],
});

function bridgeAt(): Bridge {
  return new Bridge({
    send: () => true,
    root: pairingRoot({ home }),
    extensionIds: [EXT_ID],
    serverVersion: "1.0.0-test",
    log: () => {},
  });
}

describe("import-once", () => {
  it("reads the older record in as profile one when no profile record exists", () => {
    writePairingRecord({ token: KEY_A, pairedAt: PAIRED_AT }, home);
    const book = createProfileBook({ home });
    expect(book.list()).toEqual([
      { digest: digestToken(KEY_A), pairedAt: PAIRED_AT, browserIds: [] },
    ]);
    expect(readProfiles(home).kind).toBe("ready");
    expect(bridgeAt().handshake(hello(KEY_A, "laptop"), ORIGIN).t).toBe(
      "hello_ack",
    );
  });

  it("a profile revoked here stays revoked after a restart", () => {
    writePairingRecord({ token: KEY_A, pairedAt: PAIRED_AT }, home);
    writeProfiles(
      [
        { digest: digestToken(KEY_A), pairedAt: PAIRED_AT, browserIds: ["a"] },
        { digest: digestToken(KEY_B), pairedAt: PAIRED_AT, browserIds: ["b"] },
      ],
      home,
    );
    expect(createProfileBook({ home }).revoke(digestToken(KEY_A))).toBe(true);
    const restarted = bridgeAt();
    expect(restarted.handshake(hello(KEY_A, "a"), ORIGIN)).toMatchObject({
      t: "hello_nack",
      reason: "revoked",
    });
    expect(restarted.handshake(hello(KEY_B, "b"), ORIGIN).t).toBe("hello_ack");
  });

  it.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
    "a revoke whose write fails reports failure, and the profile is still there after a restart",
    () => {
      writeProfiles(
        [
          {
            digest: digestToken(KEY_A),
            pairedAt: PAIRED_AT,
            browserIds: ["a"],
          },
        ],
        home,
      );
      const logs: string[] = [];
      const book = createProfileBook({ home, log: (line) => logs.push(line) });
      const dir = dirname(profilesPath(home));
      chmodSync(dir, 0o500);
      try {
        expect(book.revoke(digestToken(KEY_A))).toBe(false);
      } finally {
        chmodSync(dir, 0o700);
      }
      expect(book.match(KEY_A)).not.toBeNull();
      expect(logs.join("\n")).toMatch(/did not stick/);
      expect(createProfileBook({ home }).match(KEY_A)).not.toBeNull();
    },
  );

  it("revoking the imported profile leaves the older reader unpaired", () => {
    writePairingRecord({ token: KEY_A, pairedAt: PAIRED_AT }, home);
    const book = createProfileBook({ home });
    expect(book.revoke(digestToken(KEY_A))).toBe(true);
    expect(readPairingRecord(home)).toBeNull();
  });

  it("never reads the older record once a profile record exists, even a corrupt one", () => {
    writeProfiles([], home);
    writeFileSync(profilesPath(home), "{not json");
    writePairingRecord({ token: KEY_A, pairedAt: PAIRED_AT }, home);
    const book = createProfileBook({ home });
    expect(book.corrupt).toBe(true);
    expect(book.match(KEY_A)).toBeNull();
    expect(bridgeAt().handshake(hello(KEY_A, "laptop"), ORIGIN).t).toBe(
      "hello_nack",
    );
  });
});
