/**
 * Two browser profiles, each with its own key, against one connector over real
 * loopback: which calls need a named browser, what datalab_browsers reports,
 * and what a panel's own unpair ends.
 */
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CALL_TOOL,
  REQUIRED_BROWSER_CAPABILITIES,
} from "@modootoday/datalab-extension-app-mcp-core";

import { Bridge } from "../src/bridge.js";
import { createHttpBridge, type HttpBridge } from "../src/http.js";
import {
  createAppBook,
  createPairingDesk,
  fixedRoot,
  pairingRoot,
  profilesPath,
  readProfiles,
  type AppBook,
  type RootCredential,
} from "../src/pairing/index.js";

const EXT_ID = "abcdefghijklmnopabcdefghijklmnop";
const KEY_A = "a".repeat(64);
const KEY_B = "b".repeat(64);
const WRITE_TOOL = "photo_text_add";
const READ_TOOL = "keyword_trend";

interface Panel {
  frames: Array<{ id?: string; name?: string; args?: unknown }>;
  ended: Promise<void>;
  close: () => Promise<void>;
}

let home: string;
let bridge: Bridge;
let http: HttpBridge;
let apps: AppBook;
let base: string;

async function boot(root: RootCredential, withDesk: boolean): Promise<void> {
  apps = createAppBook({ home });
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
    ...(withDesk
      ? {
          pairingDesk: createPairingDesk({
            root,
            apps,
            extensionIds: [EXT_ID],
          }),
        }
      : {}),
  });
  await new Promise<void>((resolve) =>
    http.server.listen(0, "127.0.0.1", resolve),
  );
  base = `http://127.0.0.1:${(http.server.address() as AddressInfo).port}`;
}

beforeEach(async () => {
  home = mkdtempSync(join(tmpdir(), "datalab-profile-routing-"));
  await boot(pairingRoot({ home }), true);
});

afterEach(async () => {
  await http.close();
  rmSync(home, { recursive: true, force: true });
});

async function hello(
  browserId: string,
  key: string,
  about: Record<string, string> = {},
): Promise<Record<string, unknown>> {
  const res = await fetch(`${base}/bridge/hello`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      t: "hello",
      protocolVersions: [1],
      extensionVersion: "1.18.4",
      token: key,
      extensionId: EXT_ID,
      browserId,
      capabilities: [...REQUIRED_BROWSER_CAPABILITIES],
      ...about,
    }),
  });
  return (await res.json()) as Record<string, unknown>;
}

async function attach(
  browserId: string,
  key: string,
  about: Record<string, string> = {},
): Promise<Panel> {
  const ack = await hello(browserId, key, about);
  expect(ack.t, `${browserId} hello`).toBe("hello_ack");
  const res = await fetch(
    `${base}/bridge/events?session=${encodeURIComponent(String(ack.sessionId))}`,
    { headers: { authorization: `Bearer ${key}` } },
  );
  expect(res.status).toBe(200);
  const frames: Panel["frames"] = [];
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const ended = (async () => {
    for (;;) {
      const { done, value } = await reader.read().catch(() => ({
        done: true as const,
        value: undefined,
      }));
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
    frames,
    ended,
    close: async () => {
      await reader.cancel().catch(() => {});
      await ended;
    },
  };
}

async function answer(
  panel: Panel,
  browserId: string,
  key: string,
): Promise<void> {
  const frame = panel.frames.at(-1);
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
      result: { answeredBy: browserId },
      route: { browserId },
    }),
  });
  expect(res.status).toBe(202);
}

async function unpair(key: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${base}/bridge/pairing`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "unpair", token: key, extensionId: EXT_ID }),
  });
  return (await res.json()) as Record<string, unknown>;
}

const settle = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 60));

describe("unaddressed calls with two live profiles", () => {
  it("refuses a write that names no browser and reaches only the named one", async () => {
    const a = await attach("profile-a", KEY_A);
    const b = await attach("profile-b", KEY_B);

    await expect(bridge.callTool(WRITE_TOOL, {})).rejects.toMatchObject({
      reason: "browser_required",
    });
    await expect(
      bridge.callTool(CALL_TOOL, { tool: WRITE_TOOL, args: {} }),
    ).rejects.toMatchObject({ reason: "browser_required" });
    await expect(bridge.callTool("not_a_known_tool", {})).rejects.toMatchObject(
      { reason: "browser_required" },
    );
    expect([a.frames.length, b.frames.length]).toEqual([0, 0]);

    const named = bridge.callTool(WRITE_TOOL, {}, "profile-b");
    await settle();
    expect([a.frames.length, b.frames.length]).toEqual([0, 1]);
    await answer(b, "profile-b", KEY_B);
    await expect(named).resolves.toMatchObject({
      result: { answeredBy: "profile-b" },
    });
    await Promise.all([a.close(), b.close()]);
  });

  it("serves an unaddressed read on the primary browser", async () => {
    const a = await attach("profile-a", KEY_A);
    const b = await attach("profile-b", KEY_B);
    const read = bridge.callTool(CALL_TOOL, { tool: READ_TOOL, args: {} });
    await settle();
    expect([a.frames.length, b.frames.length]).toEqual([1, 0]);
    await answer(a, "profile-a", KEY_A);
    await expect(read).resolves.toMatchObject({
      result: { answeredBy: "profile-a" },
    });
    await Promise.all([a.close(), b.close()]);
  });

  it("serves an unaddressed write when the browsers share one profile's key", async () => {
    const a = await attach("window-a", KEY_A);
    const b = await attach("window-b", KEY_A);
    const write = bridge.callTool(WRITE_TOOL, {});
    await settle();
    await answer(a, "window-a", KEY_A);
    await expect(write).resolves.toMatchObject({
      result: { answeredBy: "window-a" },
    });
    await Promise.all([a.close(), b.close()]);
  });
});

describe("datalab_browsers", () => {
  it("lists the browser name, profile label and blog id each panel reported", async () => {
    const a = await attach("profile-a", KEY_A, {
      browserName: "웨일",
      browserLabel: "업무",
      blogId: "my_blog-1",
    });
    const b = await attach("profile-b", KEY_B, { blogId: "../not an id" });
    expect(bridge.connectedBrowsers()).toEqual([
      {
        id: "profile-a",
        name: "업무",
        browser: "웨일",
        label: "업무",
        blogId: "my_blog-1",
        primary: true,
      },
      {
        id: "profile-b",
        name: null,
        browser: null,
        label: null,
        blogId: null,
        primary: false,
      },
    ]);
    await Promise.all([a.close(), b.close()]);
  });

  it("keeps the reported label in the profile record, written only on change", async () => {
    const a = await attach("profile-a", KEY_A, { browserLabel: "업무" });
    const read = readProfiles(home);
    expect(read.kind === "ready" && read.profiles[0]?.label).toBe("업무");
    await a.close();
  });
});

describe("a panel unpairing its own profile", () => {
  it("ends that profile's streams and record, and the other profile stays", async () => {
    const a = await attach("profile-a", KEY_A, { browserLabel: "업무" });
    const b = await attach("profile-b", KEY_B);
    const pending = bridge
      .callTool(WRITE_TOOL, {}, "profile-a")
      .catch((error: unknown) => error);
    await settle();

    expect(await unpair(KEY_A)).toMatchObject({ ok: true });
    await a.ended;
    expect(await pending).toMatchObject({ reason: "disconnected" });
    expect(bridge.connectedBrowsers().map((entry) => entry.id)).toEqual([
      "profile-b",
    ]);
    const read = readProfiles(home);
    expect(read.kind === "ready" && read.profiles.length).toBe(1);
    expect(await hello("profile-a", KEY_A)).toMatchObject({
      t: "hello_nack",
      reason: "revoked",
    });

    const write = bridge.callTool(WRITE_TOOL, {});
    await settle();
    await answer(b, "profile-b", KEY_B);
    await expect(write).resolves.toMatchObject({
      result: { answeredBy: "profile-b" },
    });
    await b.close();
  });

  it("refuses an unpair from a key that never paired, adding nothing", async () => {
    expect(await unpair(KEY_B)).toMatchObject({
      ok: false,
      reason: "unauthorized",
    });
    expect(existsSync(profilesPath(home))).toBe(false);
  });
});

describe("a token in the environment", () => {
  it("adds no profile, writes no record and has nothing to unpair", async () => {
    await http.close();
    await boot(fixedRoot(KEY_A), false);
    const a = await attach("profile-a", KEY_A, { browserLabel: "업무" });
    const b = await attach("profile-b", KEY_A);
    expect(existsSync(profilesPath(home))).toBe(false);
    expect(bridge.connectedBrowsers()).toHaveLength(2);
    const res = await fetch(`${base}/bridge/pairing`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "unpair", token: KEY_A }),
    });
    expect(res.status).toBe(404);
    await Promise.all([a.close(), b.close()]);
  });
});
