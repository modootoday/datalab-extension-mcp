import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  REQUIRED_BROWSER_CAPABILITIES,
  type HelloAck,
} from "@modootoday/datalab-extension-app-mcp-core";

import { Bridge } from "../src/bridge.js";
import {
  pairingRoot,
  readProfiles,
  writeProfiles,
} from "../src/pairing/index.js";
import { digestToken } from "../src/token-digest.js";

const EXT_ID = "abcdefghijklmnopabcdefghijklmnop";
const ORIGIN = `chrome-extension://${EXT_ID}`;
const KEY_A = "a".repeat(64);
const KEY_B = "b".repeat(64);
const PAIRED_AT = "2026-11-01T00:00:00.000Z";

let home: string;
let sent: Array<{ key: string; frame: { id?: string } }>;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "datalab-digest-profile-"));
  sent = [];
  writeProfiles(
    [
      {
        digest: digestToken(KEY_A),
        pairedAt: PAIRED_AT,
        browserIds: ["profile-a"],
      },
      { digest: digestToken(KEY_B), pairedAt: PAIRED_AT, browserIds: [] },
    ],
    home,
  );
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
    send: (frame, key) => {
      sent.push({ key, frame: frame as { id?: string } });
      return true;
    },
    root: pairingRoot({ home }),
    extensionIds: [EXT_ID],
    serverVersion: "1.0.0-test",
    log: () => {},
  });
}

function attachA(bridge: Bridge): string {
  const ack = bridge.handshake(hello(KEY_A, "profile-a"), ORIGIN) as HelloAck;
  expect(ack.t).toBe("hello_ack");
  expect(bridge.activateSession("profile-a", ack.sessionId)).toBe(true);
  return ack.sessionId;
}

describe("digest-keyed-profile", () => {
  it("B's own valid key with A's browser id is refused while A streams", () => {
    const bridge = bridgeAt();
    const sessionA = attachA(bridge);
    expect(bridge.handshake(hello(KEY_B, "profile-a"), ORIGIN)).toMatchObject({
      t: "hello_nack",
      reason: "paired_elsewhere",
    });
    expect(bridge.keyForSession(sessionA)).toBe("profile-a");
    expect(bridge.authorizeSession("profile-a", KEY_B)).toBe(false);
  });

  it("B cannot take A's slot while A is detached, so A's routed calls never reach B", async () => {
    const bridge = bridgeAt();
    attachA(bridge);
    bridge.disconnect("profile-a");
    expect(bridge.handshake(hello(KEY_B, "profile-a"), ORIGIN)).toMatchObject({
      t: "hello_nack",
      reason: "paired_elsewhere",
    });
    await expect(
      bridge.callTool("keyword_trend", {}, "profile-a"),
    ).rejects.toMatchObject({ reason: "browser_unknown" });
    expect(sent).toEqual([]);
  });

  it("the binding survives a restart: B is refused A's id before A ever reconnects", () => {
    attachA(bridgeAt());
    const restarted = bridgeAt();
    expect(
      restarted.handshake(hello(KEY_B, "profile-a"), ORIGIN),
    ).toMatchObject({
      t: "hello_nack",
      reason: "paired_elsewhere",
    });
    const read = readProfiles(home);
    expect(read.kind === "ready" && read.profiles[1]?.browserIds).toEqual([]);
  });

  it("B's key never opens A's file request", () => {
    const bridge = bridgeAt();
    const sessionA = attachA(bridge);
    const auth = bridge.authorizeFileRequest({
      sessionId: sessionA,
      requestId: "r1",
      token: KEY_B,
      path: "/tmp/photo.png",
      tool: "editor_insert_image",
    });
    expect(auth).toMatchObject({
      ok: false,
      reason: "file_session_token_mismatch",
    });
  });

  it("B under its own browser id gets its own session, beside A's", () => {
    const bridge = bridgeAt();
    attachA(bridge);
    const ack = bridge.handshake(hello(KEY_B, "profile-b"), ORIGIN) as HelloAck;
    expect(ack.t).toBe("hello_ack");
    expect(bridge.authorizeSession("profile-b", KEY_B)).toBe(true);
    expect(bridge.authorizeSession("profile-a", KEY_B)).toBe(false);
  });

  it("an unknown key with a known browser id is refused and replaces nothing", () => {
    const bridge = bridgeAt();
    attachA(bridge);
    expect(
      bridge.handshake(hello("c".repeat(64), "profile-a"), ORIGIN),
    ).toMatchObject({ t: "hello_nack", reason: "paired_elsewhere" });
    expect(bridge.authorizeSession("profile-a", KEY_A)).toBe(true);
  });
});
