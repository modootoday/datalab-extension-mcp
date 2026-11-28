import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MIN_TOKEN_LENGTH,
  REQUIRED_BROWSER_CAPABILITIES,
} from "@modootoday/datalab-extension-app-mcp-core";

import { Bridge } from "../src/bridge.js";
import {
  pairingPath,
  pairingRoot,
  writePairingRecord,
} from "../src/pairing/index.js";

const EXT_ID = "abcdefghijklmnopabcdefghijklmnop";
const ORIGIN = `chrome-extension://${EXT_ID}`;
const KEY_A = "a".repeat(64);

let home: string;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "datalab-downgrade-"));
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
});

/** The reader 1.18.1 and 1.18.2 ship: one shape, anything else is unpaired. */
function olderReader(): { token: string; pairedAt: string } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(pairingPath(home), "utf8"));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const { token, pairedAt } = parsed as Record<string, unknown>;
  if (typeof token !== "string" || token.length < MIN_TOKEN_LENGTH) return null;
  if (typeof pairedAt !== "string") return null;
  return { token, pairedAt };
}

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

describe("downgrade-1-18-1", () => {
  it("a first profile paired here reads as paired with that profile in the older reader", () => {
    expect(bridgeAt().handshake(hello(KEY_A, "laptop"), ORIGIN).t).toBe(
      "hello_ack",
    );
    expect(olderReader()?.token).toBe(KEY_A);
  });

  it("an upgraded machine keeps the older record byte for byte", () => {
    writePairingRecord(
      { token: KEY_A, pairedAt: "2026-11-01T00:00:00.000Z" },
      home,
    );
    const before = readFileSync(pairingPath(home));
    const bridge = bridgeAt();
    expect(bridge.handshake(hello(KEY_A, "laptop"), ORIGIN).t).toBe(
      "hello_ack",
    );
    expect(readFileSync(pairingPath(home)).equals(before)).toBe(true);
    expect(olderReader()?.token).toBe(KEY_A);
  });
});
