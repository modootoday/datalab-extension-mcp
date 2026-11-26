import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Bridge } from "../src/bridge.js";
import { resolveConfig } from "../src/config.js";
import {
  CLAIM_WINDOW_MS,
  deletePairingRecord,
  fixedRoot,
  pairingPath,
  pairingRoot,
  readPairingRecord,
} from "../src/pairing/index.js";
import {
  PUBLISHED_EXTENSION_ID,
  REQUIRED_BROWSER_CAPABILITIES,
} from "@modootoday/datalab-extension-app-mcp-core";

const EXT_ID = "abcdefghijklmnopabcdefghijklmnop";
const ORIGIN = `chrome-extension://${EXT_ID}`;
const FIRST = "a".repeat(64);
const SECOND = "b".repeat(64);

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

describe("first claim", () => {
  it("an unpaired connector pairs with the first panel and stores its token", () => {
    const bridge = bridgeWith(pairingRoot({ home }));
    const ack = bridge.handshake(hello(FIRST), ORIGIN);
    expect(ack.t).toBe("hello_ack");
    expect(readPairingRecord(home)?.token).toBe(FIRST);
  });

  it("refuses a second token once paired", () => {
    const bridge = bridgeWith(pairingRoot({ home }));
    bridge.handshake(hello(FIRST), ORIGIN);
    const nack = bridge.handshake(hello(SECOND, "other"), ORIGIN);
    expect(nack.t).toBe("hello_nack");
    expect(readPairingRecord(home)?.token).toBe(FIRST);
  });

  it("keeps the pairing across a restart", () => {
    bridgeWith(pairingRoot({ home })).handshake(hello(FIRST), ORIGIN);
    const restarted = bridgeWith(pairingRoot({ home }));
    expect(restarted.handshake(hello(SECOND), ORIGIN).t).toBe("hello_nack");
    expect(restarted.handshake(hello(FIRST), ORIGIN).t).toBe("hello_ack");
  });

  it("refuses a claim after the window closes and writes nothing", () => {
    let now = 1_000;
    const bridge = bridgeWith(pairingRoot({ home, now: () => now }));
    now += CLAIM_WINDOW_MS + 1;
    const nack = bridge.handshake(hello(FIRST), ORIGIN);
    expect(nack.t).toBe("hello_nack");
    expect(readPairingRecord(home)).toBeNull();
  });

  it("refuses a hello with a wrong origin before any claim", () => {
    const bridge = bridgeWith(pairingRoot({ home }));
    const nack = bridge.handshake(hello(FIRST), "https://example.com");
    expect(nack.t).toBe("hello_nack");
    expect(readPairingRecord(home)).toBeNull();
  });

  it("a web page cannot claim: a foreign or opaque Origin is refused even when the body names the extension", () => {
    const bridge = bridgeWith(pairingRoot({ home }));
    for (const origin of ["https://example.com", "null"]) {
      expect(bridge.handshake(hello(FIRST), origin)).toMatchObject({
        t: "hello_nack",
        reason: "forbidden_origin",
      });
    }
    expect(readPairingRecord(home)).toBeNull();
  });

  it("a handshake that names no browser is refused and does not spend the pairing", () => {
    const bridge = bridgeWith(pairingRoot({ home }));
    const nameless = { ...(hello(FIRST) as object), browserId: undefined };
    expect(bridge.handshake(nameless, ORIGIN).t).toBe("hello_nack");
    expect(readPairingRecord(home)).toBeNull();
    expect(bridge.handshake(hello(SECOND), ORIGIN).t).toBe("hello_ack");
    expect(readPairingRecord(home)?.token).toBe(SECOND);
  });

  it("an outdated panel is refused and does not spend the pairing", () => {
    const bridge = bridgeWith(pairingRoot({ home }));
    const outdated = { ...(hello(FIRST) as object), capabilities: [] };
    expect(bridge.handshake(outdated, ORIGIN).t).toBe("hello_nack");
    expect(readPairingRecord(home)).toBeNull();
  });

  it("refuses a short token and stays unpaired", () => {
    const root = pairingRoot({ home });
    expect(root.claim("short")).toBe("invalid_token");
    expect(root.current()).toBeNull();
  });

  it.skipIf(process.platform === "win32")(
    "stores the record readable by its owner only",
    () => {
      pairingRoot({ home }).claim(FIRST);
      expect(statSync(pairingPath(home)).mode & 0o777).toBe(0o600);
    },
  );

  it("unpairing removes the record so the next start accepts a claim", () => {
    pairingRoot({ home }).claim(FIRST);
    expect(deletePairingRecord(home)).toBe(true);
    expect(pairingRoot({ home }).claim(SECOND)).toBe("claimed");
  });

  it("a fixed token never accepts a claim and writes nothing", () => {
    const root = fixedRoot(FIRST);
    expect(root.claim(SECOND)).toBe("already_paired");
    expect(readPairingRecord(home)).toBeNull();
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
