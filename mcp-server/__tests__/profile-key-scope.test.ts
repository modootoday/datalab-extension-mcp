import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { REQUIRED_BROWSER_CAPABILITIES } from "@modootoday/datalab-extension-app-mcp-core";

import { Bridge } from "../src/bridge.js";
import { createHttpBridge, type HttpBridge } from "../src/http.js";
import {
  fixedRoot,
  pairingRoot,
  readPairingRecord,
  type RootCredential,
} from "../src/pairing/index.js";
const packageJson = JSON.parse(
  readFileSync(
    new URL("../../extension-mcp/package.json", import.meta.url),
    "utf8",
  ),
) as { version: string };

const EXT_ID = "abcdefghijklmnopabcdefghijklmnop";
const ORIGIN = `chrome-extension://${EXT_ID}`;
const KEY_A = "a".repeat(64);
const KEY_B = "b".repeat(64);
const TAKEOVER = "t".repeat(64);
const ENV_TOKEN = "e".repeat(64);

let home: string;
let bridge: Bridge;
let http: HttpBridge;
let base: string;
let shutdowns: number;

async function boot(root: RootCredential): Promise<void> {
  shutdowns = 0;
  bridge = new Bridge({
    send: (frame, key) => http.send(frame, key),
    root,
    extensionIds: [EXT_ID],
    serverVersion: "0.0.1-test",
    log: () => {},
  });
  http = createHttpBridge({
    bridge,
    port: 0,
    identity: { name: "datalab-extension-mcp-server", version: "0.0.1-test" },
    verifyTakeover: (presented) => presented === TAKEOVER,
    verifyLegacyKey: (presented) =>
      readPairingRecord(home)?.token === presented,
    onShutdown: () => {
      shutdowns += 1;
    },
  });
  await new Promise<void>((r) => http.server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(http.server.address() as AddressInfo).port}`;
}

beforeEach(async () => {
  home = mkdtempSync(join(tmpdir(), "datalab-key-scope-"));
  await boot(pairingRoot({ home }));
});

afterEach(async () => {
  await http.close();
  rmSync(home, { recursive: true, force: true });
});

const pair = (key: string, browserId: string): string => {
  const ack = bridge.handshake(
    {
      t: "hello",
      protocolVersions: [1],
      extensionVersion: "1.1.32",
      token: key,
      extensionId: EXT_ID,
      browserId,
      capabilities: [...REQUIRED_BROWSER_CAPABILITIES],
    },
    ORIGIN,
  );
  if (ack.t !== "hello_ack") throw new Error(`refused ${browserId}`);
  return ack.sessionId;
};

const post = (path: string, token: string): Promise<Response> =>
  fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  });

describe("profile-key-scope", () => {
  it("a profile key that paired on its own cannot stop the daemon", async () => {
    pair(KEY_A, "whale");
    pair(KEY_B, "chrome");
    expect((await post("/mcp/shutdown", KEY_B)).status).toBe(403);
    expect((await post("/mcp/shutdown", KEY_A)).status).toBe(403);
    expect(shutdowns).toBe(0);
  });

  it("a profile key that is not the single pairing file's key fails the authority probe", async () => {
    pair(KEY_A, "whale");
    pair(KEY_B, "chrome");
    expect((await post("/mcp/authority", KEY_B)).status).toBe(403);
  });

  it("the takeover secret opens shutdown and the authority probe", async () => {
    pair(KEY_A, "whale");
    expect((await post("/mcp/authority", TAKEOVER)).status).toBe(204);
    expect((await post("/mcp/shutdown", TAKEOVER)).status).toBe(200);
    expect(shutdowns).toBe(1);
  });

  it("B's key never opens A's file request", () => {
    const sessionA = pair(KEY_A, "whale");
    pair(KEY_B, "chrome");
    const auth = bridge.authorizeFileRequest({
      sessionId: sessionA,
      requestId: "r1",
      token: KEY_B,
      path: "/tmp/x",
    });
    expect(auth).toMatchObject({
      ok: false,
      reason: "file_session_token_mismatch",
      credential: "unknown",
    });
  });

  it("with a token in the environment, that token still stops the daemon", async () => {
    await http.close();
    await boot(fixedRoot(ENV_TOKEN));
    expect((await post("/mcp/authority", ENV_TOKEN)).status).toBe(204);
    expect((await post("/mcp/shutdown", ENV_TOKEN)).status).toBe(200);
  });
});

describe("legacy-adapter-key", () => {
  it("is accepted until 1.19.0; this test fails then so the allowance is removed on purpose", () => {
    const [major, minor] = packageJson.version.split(".").map(Number);
    expect((major ?? 0) * 1000 + (minor ?? 0)).toBeLessThan(1 * 1000 + 19);
  });

  it("an adapter at 1.18.3 or older is still served on POST /mcp with the single pairing file's key", async () => {
    pair(KEY_A, "whale");
    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${KEY_A}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(res.status).toBe(200);
  });
});

describe("mixed-version", () => {
  it("a 1.18.3 or older adapter probing with the single pairing file's key is told this daemon is its own and stops nothing", async () => {
    pair(KEY_A, "whale");
    pair(KEY_B, "chrome");
    const legacyKey = readPairingRecord(home)?.token ?? "";
    expect(legacyKey).toBe(KEY_A);
    expect((await post("/mcp/authority", legacyKey)).status).toBe(204);
    expect((await post("/mcp/shutdown", legacyKey)).status).toBe(403);
    expect(shutdowns).toBe(0);
  });
});
