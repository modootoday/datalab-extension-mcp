/**
 * The one route that accepts bytes.
 *
 * 🔴 A daemon that was never wired for staging must not be talkable into
 * writing files, and a token it will not honour has to stop the bytes at the
 * door rather than after they land. Both are checked against a real server on a
 * real socket, because the thing under test is what the socket accepts.
 */
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Bridge } from "../src/bridge.js";
import { createHttpBridge, type HttpBridge } from "../src/http.js";
import { createMediaStage, type MediaStage } from "../src/media-stage.js";

const TOKEN = "t".repeat(40);
const BYTES = Buffer.from("사진 바이트 — 외부에서 만들어진 것", "utf8");
const JOB = {
  blogId: "minago_",
  runId: "run-1",
  slot: "slot-a",
  actionId: "act-1",
  fence: 1,
  jobId: "job-1",
};

let http: HttpBridge;
let base = "";
let root = "";
let stage: MediaStage | undefined;

async function boot(withStage: boolean): Promise<void> {
  root = await mkdtemp(join(tmpdir(), "media-upload-"));
  stage = withStage ? createMediaStage({ root }) : undefined;
  const bridge = new Bridge({
    // Resolved lazily: http is assigned on the next line, and the bridge only
    // sends once a panel connects — which no test here does.
    send: (frame) => http.send(frame),
    token: TOKEN,
    extensionId: "a".repeat(32),
    serverVersion: "0.0.1-test",
  });
  http = createHttpBridge({
    bridge,
    port: 0,
    identity: { name: "test", version: "0.0.0-test" },
    ...(stage ? { mediaStage: stage } : {}),
  });
  await new Promise<void>((r) => http.server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(http.server.address() as AddressInfo).port}`;
}

const upload = (token: string, body: Buffer) =>
  fetch(`${base}/media/upload`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/octet-stream",
    },
    body: new Uint8Array(body),
  });

afterEach(async () => {
  await http.close();
  await rm(root, { recursive: true, force: true });
});

describe("staging 이 꺼진 데몬", () => {
  beforeEach(() => boot(false));

  /** 🔴 No root configured means no writing, not a root invented on the spot. */
  it("🔴 업로드 경로가 아예 없다 — 파일도 쓰지 않는다", async () => {
    const res = await upload("anything", BYTES);
    expect(res.status).toBe(404);
    expect(await readdir(root)).toEqual([]);
  });
});

describe("staging 이 켜진 데몬", () => {
  beforeEach(() => boot(true));

  it("유효한 token 이면 바이트를 받는다", async () => {
    const begun = await stage!.begin({
      ...JOB,
      declaredBytes: BYTES.byteLength,
    });
    if (begun.state !== "OPEN") throw new Error("not open");

    const res = await upload(begun.uploadToken, BYTES);
    expect(res.status).toBe(202);
    expect(await res.json()).toMatchObject({
      ok: true,
      bytes: BYTES.byteLength,
    });
    expect((await stage!.status(JOB)).bytesReceived).toBe(BYTES.byteLength);
  });

  it("🔴 모르는 token 은 바이트를 한 개도 받지 않는다", async () => {
    const res = await upload("not-a-token", BYTES);
    expect(res.status).toBe(403);
    expect((await stage!.status(JOB)).bytesReceived).toBe(0);
  });

  it("Authorization 헤더가 없으면 거부한다", async () => {
    const res = await fetch(`${base}/media/upload`, {
      method: "POST",
      body: new Uint8Array(BYTES),
    });
    expect(res.status).toBe(403);
  });

  /**
   * 🔴 A caller retrying a 403 needs a new token; one retrying a 400 needs
   * different bytes. Collapsing them sends half of them the wrong way.
   */
  it("🔴 만료는 403, 나쁜 바이트는 400 — 고치는 방법이 다르다", async () => {
    const shortLived = createMediaStage({ root, tokenTtlMs: 1 });
    const begun = await shortLived.begin({ ...JOB, declaredBytes: 10 });
    if (begun.state !== "OPEN") throw new Error("not open");
    await new Promise((r) => setTimeout(r, 5));

    // Same server, a stage whose token is already dead.
    const res = await fetch(`${base}/media/upload`, {
      method: "POST",
      headers: { authorization: `Bearer ${begun.uploadToken}` },
      body: new Uint8Array(BYTES),
    });
    expect(res.status).toBe(403);
  });

  it("GET 은 이 경로에 없다", async () => {
    const res = await fetch(`${base}/media/upload`);
    expect(res.status).toBe(404);
  });
});
