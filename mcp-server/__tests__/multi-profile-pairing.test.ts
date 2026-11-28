/**
 * Several browser profiles against one connector over real loopback. Each
 * profile mints its own key and pairs on its first hello; a browser id bound
 * to one key is refused with another.
 */
import { mkdtempSync, rmSync } from "node:fs";
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

const EXT_ID = "abcdefghijklmnopabcdefghijklmnop";
const KEY_A = "a".repeat(64);
const KEY_B = "b".repeat(64);
const KEY_C = "c".repeat(64);

interface Panel {
  sessionId: string;
  frames: Array<{ id?: string; method?: string; args?: unknown }>;
  close: () => Promise<void>;
}

let home: string;
let bridge: Bridge;
let http: HttpBridge;
let base: string;
let refs: number;
let now: number;

async function boot(root: RootCredential): Promise<void> {
  refs = 0;
  bridge = new Bridge({
    send: (frame, key) => http.send(frame, key),
    root,
    extensionIds: [EXT_ID],
    serverVersion: "0.0.1-test",
    rateLimit: { capacity: 100, refillPerSecond: 100 },
  });
  http = createHttpBridge({
    bridge,
    port: 0,
    heartbeatMs: 50,
    identity: { name: "datalab-extension-mcp-server", version: "0.0.1-test" },
    lifecycle: {
      retain: () => {
        refs += 1;
      },
      release: () => {
        refs -= 1;
      },
      bump: () => {},
    },
  });
  await new Promise<void>((resolve) =>
    http.server.listen(0, "127.0.0.1", resolve),
  );
  base = `http://127.0.0.1:${(http.server.address() as AddressInfo).port}`;
}

beforeEach(async () => {
  home = mkdtempSync(join(tmpdir(), "datalab-multi-profile-"));
  now = 1_000;
  await boot(pairingRoot({ home, now: () => now }));
});

afterEach(async () => {
  await http.close();
  rmSync(home, { recursive: true, force: true });
});

async function hello(
  browserId: string,
  key: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${base}/bridge/hello`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      t: "hello",
      protocolVersions: [1],
      extensionVersion: "1.1.32",
      token: key,
      extensionId: EXT_ID,
      browserId,
      capabilities: [...REQUIRED_BROWSER_CAPABILITIES],
    }),
  });
  return (await res.json()) as Record<string, unknown>;
}

async function attach(browserId: string, key: string): Promise<Panel> {
  const ack = await hello(browserId, key);
  expect(ack.t, `${browserId} hello`).toBe("hello_ack");
  const sessionId = String(ack.sessionId);
  const res = await fetch(
    `${base}/bridge/events?session=${encodeURIComponent(sessionId)}`,
    { headers: { authorization: `Bearer ${key}` } },
  );
  expect(res.status).toBe(200);
  const frames: Panel["frames"] = [];
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const pump = (async () => {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const frame = JSON.parse(
          buf.slice(0, idx).replace(/^data: /, ""),
        ) as Panel["frames"][number] & { t?: string };
        buf = buf.slice(idx + 2);
        if (frame.t !== "hb") frames.push(frame);
      }
    }
  })();
  return {
    sessionId,
    frames,
    close: async () => {
      await reader.cancel().catch(() => {});
      await pump.catch(() => {});
    },
  };
}

async function answer(
  panel: Panel,
  browserId: string,
  key: string,
  index: number,
): Promise<number> {
  const frame = panel.frames[index];
  const res = await fetch(`${base}/bridge/result`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      t: "res",
      id: frame?.id,
      ok: true,
      result: { answeredBy: browserId, args: frame?.args },
      route: { browserId },
    }),
  });
  return res.status;
}

const settle = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 60));

describe("browser profiles that each minted their own key", () => {
  it("the first profile pairs, and a second profile with its own key pairs beside it", async () => {
    const a = await attach("profile-a", KEY_A);
    const b = await attach("profile-b", KEY_B);
    expect(readPairingRecord(home)?.token).toBe(KEY_A);
    expect(bridge.connectedBrowsers().map((entry) => entry.id)).toEqual([
      "profile-a",
      "profile-b",
    ]);
    await Promise.all([a.close(), b.close()]);
  });

  it("another key retrying a bound browser id in a loop never moves the pairing or detaches the paired profile", async () => {
    const a = await attach("profile-a", KEY_A);
    for (let i = 0; i < 30; i += 1) {
      expect((await hello("profile-a", KEY_B)).reason).toBe("paired_elsewhere");
    }
    const call = bridge.callTool("keyword_trend", { probe: "a" }, "profile-a");
    await settle();
    expect(await answer(a, "profile-a", KEY_A, 0)).toBe(202);
    await expect(call).resolves.toMatchObject({
      result: { answeredBy: "profile-a" },
    });
    expect(refs).toBe(1);
    expect(readPairingRecord(home)?.token).toBe(KEY_A);
    await a.close();
  });

  it("three profiles holding the paired key answer their own concurrent calls", async () => {
    const a = await attach("profile-a", KEY_A);
    const b = await attach("profile-b", KEY_A);
    const c = await attach("profile-c", KEY_A);
    expect(refs).toBe(3);

    const calls = ["profile-a", "profile-b", "profile-c"].map((id) =>
      bridge.callTool("keyword_trend", { for: id }, id),
    );
    await settle();
    expect([a.frames.length, b.frames.length, c.frames.length]).toEqual([
      1, 1, 1,
    ]);
    expect(await answer(c, "profile-c", KEY_A, 0)).toBe(202);
    expect(await answer(a, "profile-a", KEY_A, 0)).toBe(202);
    expect(await answer(b, "profile-b", KEY_A, 0)).toBe(202);
    const results = await Promise.all(calls);
    expect(results.map((r) => r.result)).toEqual([
      { answeredBy: "profile-a", args: { for: "profile-a" } },
      { answeredBy: "profile-b", args: { for: "profile-b" } },
      { answeredBy: "profile-c", args: { for: "profile-c" } },
    ]);
    await Promise.all([a.close(), b.close(), c.close()]);
    await settle();
    expect(refs).toBe(0);
  });

  it("interleaved reloads and one profile closing leave the other profiles attached", async () => {
    const a = await attach("profile-a", KEY_A);
    const b = await attach("profile-b", KEY_A);
    const c = await attach("profile-c", KEY_A);

    expect((await hello("profile-b", KEY_A)).reason).toBe("session_active");
    await b.close();
    expect((await hello("profile-c", KEY_C)).reason).toBe("paired_elsewhere");
    await settle();
    const b2 = await attach("profile-b", KEY_A);
    await c.close();
    await settle();

    expect(bridge.connectedBrowsers().map((entry) => entry.id)).toEqual([
      "profile-a",
      "profile-b",
    ]);
    const toA = bridge.callTool("keyword_trend", { n: 1 }, "profile-a");
    const toB = bridge.callTool("keyword_trend", { n: 2 }, "profile-b");
    await settle();
    expect(b.frames).toHaveLength(0);
    expect(await answer(b2, "profile-b", KEY_A, 0)).toBe(202);
    expect(await answer(a, "profile-a", KEY_A, 0)).toBe(202);
    await expect(toA).resolves.toMatchObject({
      result: { answeredBy: "profile-a" },
    });
    await expect(toB).resolves.toMatchObject({
      result: { answeredBy: "profile-b" },
    });
    expect(refs).toBe(2);
    await Promise.all([a.close(), b2.close()]);
  });
});

describe("when a profile pairs", () => {
  it("hours after start a new profile still pairs on its first hello", async () => {
    now += 6 * 60 * 60 * 1000;
    expect((await hello("profile-a", KEY_A)).t).toBe("hello_ack");
    expect(readPairingRecord(home)?.token).toBe(KEY_A);
  });

  it("a configured token still refuses a different key as unauthorized", async () => {
    await http.close();
    await boot(fixedRoot(KEY_A));
    expect(await hello("profile-b", KEY_B)).toMatchObject({
      t: "hello_nack",
      reason: "unauthorized",
    });
  });
});
