import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BROWSER_ROUTING_CAPABILITY,
  BRIDGE_AUTH_CAPABILITY,
  LOCAL_FILE_REQUEST_CAPABILITY,
} from "@modootoday/datalab-extension-app-mcp-core";

import { Bridge, STAGE_GRANT_TTL_MS, stageHandlesIn } from "../src/bridge.js";
import { createHttpBridge, type HttpBridge } from "../src/http.js";
import { createMediaStage, type MediaStage } from "../src/media-stage.js";

const ROOT = "pairing-token-that-is-long-enough-32";
const EXT_ID = "a".repeat(32);
const ORIGIN = `chrome-extension://${EXT_ID}`;
const MIB = 1024 * 1024;

let http: HttpBridge;
let bridge: Bridge;
let stage: MediaStage;
let base = "";
let root = "";
let clock = 1_000_000;
let closers: Array<() => Promise<void>> = [];

beforeEach(async () => {
  closers = [];
  clock = 1_000_000;
  root = await mkdtemp(join(tmpdir(), "stage-range-"));
  stage = createMediaStage({ root });
  bridge = new Bridge({
    send: (frame, key) => http.send(frame, key),
    token: ROOT,
    extensionIds: [EXT_ID],
    serverVersion: "0.0.1-test",
    log: () => {},
    now: () => clock,
  });
  http = createHttpBridge({
    bridge,
    port: 0,
    identity: { name: "test", version: "0.0.0-test" },
    heartbeatMs: 10,
    mediaStage: stage,
  });
  await new Promise<void>((r) => http.server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(http.server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  await Promise.all(closers.map((close) => close()));
  await http.close();
  await rm(root, { recursive: true, force: true });
});

async function sealVideo(jobId: string, bytes: number): Promise<string> {
  const data = Buffer.alloc(bytes, 7);
  Buffer.from([
    0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
  ]).copy(data, 0);
  const job = {
    blogId: "b",
    runId: "r",
    slot: "s",
    actionId: "a",
    fence: 1,
    jobId,
  };
  const begun = await stage.begin({ ...job, declaredBytes: bytes });
  if (begun.state !== "OPEN") throw new Error("not open");
  await stage.receiveUpload(begun.uploadToken, Readable.from([data]));
  const sealed = await stage.commit({
    ...job,
    bytes,
    sha256: createHash("sha256").update(data).digest("hex"),
  });
  if (sealed.state !== "SEALED") throw new Error("not sealed");
  return sealed.handle;
}

async function openPanel(): Promise<{
  sessionId: string;
  nextRequestId: () => Promise<string>;
}> {
  const handshake = await fetch(`${base}/bridge/hello`, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/json" },
    body: JSON.stringify({
      t: "hello",
      protocolVersions: [1],
      extensionVersion: "1.1.13",
      token: ROOT,
      extensionId: EXT_ID,
      browserId: "brw-a",
      capabilities: [
        BRIDGE_AUTH_CAPABILITY,
        BROWSER_ROUTING_CAPABILITY,
        LOCAL_FILE_REQUEST_CAPABILITY,
      ],
    }),
  });
  const ack = (await handshake.json()) as { sessionId: string };
  const response = await fetch(
    `${base}/bridge/events?session=${encodeURIComponent(ack.sessionId)}`,
    { headers: { origin: ORIGIN, authorization: `Bearer ${ROOT}` } },
  );
  const reader = response.body?.getReader();
  closers.push(async () => {
    await reader?.cancel().catch(() => {});
  });
  let buffer = "";
  const nextRequestId = async (): Promise<string> => {
    if (!reader) throw new Error("missing event stream");
    for (;;) {
      const { done, value } = await reader.read();
      if (done) throw new Error("event stream ended");
      buffer += new TextDecoder().decode(value, { stream: true });
      let end: number;
      while ((end = buffer.indexOf("\n\n")) !== -1) {
        const raw = buffer.slice(0, end).replace(/^data: /, "");
        buffer = buffer.slice(end + 2);
        const frame = JSON.parse(raw) as { t?: string; id?: string };
        if (frame.t === "req" && typeof frame.id === "string") return frame.id;
      }
    }
  };
  return { sessionId: ack.sessionId, nextRequestId };
}

const range = (body: Record<string, unknown>): Promise<Response> =>
  fetch(`${base}/bridge/stage-range`, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

async function call(tool: string, args: Record<string, unknown>) {
  const panel = await openPanel();
  void bridge
    .callTool("datalab_call", { tool, args }, "brw-a")
    .catch(() => undefined);
  await panel.nextRequestId();
  return panel;
}

describe("stageHandlesIn", () => {
  it("finds handles at any depth and ignores lookalikes", () => {
    const h = `stage:${"b".repeat(32)}`;
    expect([
      ...stageHandlesIn({
        grade: { lut: { handle: h } },
        ops: [{ args: { handle: h } }],
        note: "stage:short",
      }),
    ]).toEqual([h]);
  });
});

describe("/bridge/stage-range", () => {
  it("reads a handle the tool call named, a range at a time", async () => {
    const handle = await sealVideo("v1", 3 * MIB);
    const panel = await call("video_source_add", { handle, as: "clip" });
    const res = await range({
      token: ROOT,
      sessionId: panel.sessionId,
      handle,
      offset: 2 * MIB,
      length: 8 * MIB,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-total-bytes")).toBe(String(3 * MIB));
    expect(res.headers.get("x-stage-kind")).toBe("video");
    expect((await res.arrayBuffer()).byteLength).toBe(MIB);
  });

  it("refuses a handle no call named and a wrong token", async () => {
    const named = await sealVideo("v1", MIB);
    const other = await sealVideo("v2", MIB);
    const panel = await call("video_source_add", { handle: named });
    const base = { sessionId: panel.sessionId, offset: 0, length: 16 };
    expect((await range({ ...base, token: ROOT, handle: other })).status).toBe(
      403,
    );
    expect(
      (await range({ ...base, token: "wrong-token", handle: named })).status,
    ).toBe(403);
  });

  it("a tool outside the stage readers grants nothing", async () => {
    const handle = await sealVideo("v3", MIB);
    const panel = await call("naver_post_get", { handle });
    expect(
      (
        await range({
          token: ROOT,
          sessionId: panel.sessionId,
          handle,
          offset: 0,
          length: 16,
        })
      ).status,
    ).toBe(403);
  });

  it("the grant outlives the call, slides with each read and ends a TTL after the last", async () => {
    const handle = await sealVideo("v1", MIB);
    const panel = await call("video_source_add", { handle });
    const body = {
      token: ROOT,
      sessionId: panel.sessionId,
      handle,
      offset: 0,
      length: 16,
    };
    clock += STAGE_GRANT_TTL_MS - 1000;
    expect((await range(body)).status).toBe(200);
    clock += STAGE_GRANT_TTL_MS - 1000;
    expect((await range(body)).status).toBe(200);
    clock += STAGE_GRANT_TTL_MS + 1;
    expect((await range(body)).status).toBe(403);
  });

  it("a session keeps the newest 64 handles and drops the oldest", async () => {
    const first = await sealVideo("v1", MIB);
    const last = await sealVideo("v2", MIB);
    const fillers = Array.from(
      { length: 70 },
      (_, i) => `stage:${i.toString(16).padStart(32, "0")}`,
    );
    const panel = await call("video_source_add", {
      handles: [first, ...fillers, last],
    });
    const read = (handle: string) =>
      range({
        token: ROOT,
        sessionId: panel.sessionId,
        handle,
        offset: 0,
        length: 16,
      });
    expect((await read(first)).status).toBe(403);
    expect((await read(last)).status).toBe(200);
  });
});
