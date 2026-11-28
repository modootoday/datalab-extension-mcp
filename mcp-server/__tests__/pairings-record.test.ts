import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { REQUIRED_BROWSER_CAPABILITIES } from "@modootoday/datalab-extension-app-mcp-core";

import { Bridge } from "../src/bridge.js";
import {
  MAX_BROWSERS_PER_PROFILE,
  createProfileBook,
  pairingRoot,
  profilesPath,
  readProfiles,
  writeProfiles,
} from "../src/pairing/index.js";
import { digestToken } from "../src/token-digest.js";

const EXT_ID = "abcdefghijklmnopabcdefghijklmnop";
const ORIGIN = `chrome-extension://${EXT_ID}`;
const KEY_A = "a".repeat(64);

let home: string;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "datalab-pairings-"));
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

function bridgeAt(logs: string[] = []): Bridge {
  return new Bridge({
    send: () => true,
    root: pairingRoot({ home, log: (line) => logs.push(line) }),
    extensionIds: [EXT_ID],
    serverVersion: "1.0.0-test",
    log: () => {},
  });
}

describe("pairings-record", () => {
  it("stores the digest of a profile's key and never the key", () => {
    bridgeAt().handshake(hello(KEY_A, "laptop"), ORIGIN);
    const body = readFileSync(profilesPath(home), "utf8");
    expect(body).not.toContain(KEY_A);
    const read = readProfiles(home);
    expect(read).toMatchObject({
      kind: "ready",
      profiles: [{ digest: digestToken(KEY_A), browserIds: ["laptop"] }],
    });
  });

  it.skipIf(process.platform === "win32")(
    "is readable by its owner only",
    () => {
      bridgeAt().handshake(hello(KEY_A, "laptop"), ORIGIN);
      expect(statSync(profilesPath(home)).mode & 0o777).toBe(0o600);
    },
  );

  it("is replaced whole, leaving no temporary file beside it", () => {
    expect(writeProfiles([], home)).toBe("written");
    expect(
      writeProfiles(
        [{ digest: digestToken(KEY_A), pairedAt: "t", browserIds: [] }],
        home,
      ),
    ).toBe("written");
    const names = readdirSync(dirname(profilesPath(home)));
    expect(names.filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });

  it("a corrupt record refuses every handshake, names the way out, and opens no window", () => {
    writeProfiles([], home);
    writeFileSync(profilesPath(home), "{not json");
    const logs: string[] = [];
    const bridge = bridgeAt(logs);
    const nack = bridge.handshake(hello(KEY_A, "laptop"), ORIGIN);
    expect(nack).toMatchObject({
      t: "hello_nack",
      reason: "record_unreadable",
    });
    expect((nack as { message: string }).message).toContain(
      "datalab-extension-mcp unpair",
    );
    expect(logs.join("\n")).toMatch(/cannot be read/);
    expect(readFileSync(profilesPath(home), "utf8")).toBe("{not json");
  });

  it.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
    "an unreadable record counts as corrupt, never as unpaired",
    () => {
      writeProfiles([], home);
      chmodSync(profilesPath(home), 0o000);
      expect(readProfiles(home)).toEqual({ kind: "corrupt" });
      expect(createProfileBook({ home }).corrupt).toBe(true);
    },
  );

  it("holds any number of profiles on one machine", () => {
    const many = Array.from({ length: 24 }, (_, i) => ({
      digest: digestToken(`key-${i}-`.padEnd(64, "k")),
      pairedAt: "t",
      browserIds: [`browser-${i}`],
    }));
    writeProfiles(many, home);
    const read = readProfiles(home);
    expect(read.kind === "ready" && read.profiles.length).toBe(24);
    const book = createProfileBook({ home });
    expect(book.add("z".repeat(64), "t")).toBe("added");
    expect(book.count()).toBe(25);
  });

  it("a record with a duplicated browser id is corrupt", () => {
    writeProfiles(
      [
        { digest: digestToken(KEY_A), pairedAt: "t", browserIds: ["x"] },
        {
          digest: digestToken("b".repeat(64)),
          pairedAt: "t",
          browserIds: ["x"],
        },
      ],
      home,
    );
    expect(readProfiles(home)).toEqual({ kind: "corrupt" });
  });

  it("binds at most the per-profile limit of browser ids and never evicts one", () => {
    const bridge = bridgeAt();
    for (let i = 0; i < MAX_BROWSERS_PER_PROFILE; i += 1) {
      expect(bridge.handshake(hello(KEY_A, `browser-${i}`), ORIGIN).t).toBe(
        "hello_ack",
      );
    }
    expect(bridge.handshake(hello(KEY_A, "one-more"), ORIGIN)).toMatchObject({
      t: "hello_nack",
      reason: "browser_limit",
    });
    const read = readProfiles(home);
    expect(read.kind === "ready" && read.profiles[0]?.browserIds).toEqual(
      Array.from(
        { length: MAX_BROWSERS_PER_PROFILE },
        (_, i) => `browser-${i}`,
      ),
    );
  });
});
