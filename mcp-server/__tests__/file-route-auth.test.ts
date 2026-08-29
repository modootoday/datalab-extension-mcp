import { mkdtemp, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BROWSER_ROUTING_CAPABILITY,
  BRIDGE_AUTH_CAPABILITY,
  LOCAL_FILE_REQUEST_CAPABILITY,
} from "@modootoday/extension-app-mcp-core";

import { Bridge } from "../src/bridge.js";
import {
  MCP_SERVER_HEALTH_NAME,
  MCP_SERVER_HEALTH_SCHEMA,
  createHttpBridge,
  type HttpBridge,
} from "../src/http.js";
import { openLocalImage } from "../src/local-file.js";

/**
 * File reads belong to one connected browser session, named by its own
 * session id and request permit rather than by a credential of its own.
 */
const ROOT = "pairing-token-that-is-long-enough-32";
/** One key per machine: both browsers present the pairing token. */
const OWN = ROOT;
const OWN_B = ROOT;
const EXT_ID = "a".repeat(32);
const ORIGIN = `chrome-extension://${EXT_ID}`;

let http: HttpBridge;
let bridge: Bridge;
let base = "";
let shutdowns = 0;
let panels: Array<() => Promise<void>> = [];
let logs: string[];
const openImage = vi.fn(openLocalImage);

const hello = (token: string, browserId?: string): unknown => ({
  t: "hello",
  protocolVersions: [1],
  extensionVersion: "1.1.13",
  token,
  extensionId: EXT_ID,
  ...(browserId === undefined ? {} : { browserId }),
  capabilities: [
    BRIDGE_AUTH_CAPABILITY,
    BROWSER_ROUTING_CAPABILITY,
    LOCAL_FILE_REQUEST_CAPABILITY,
  ],
});

beforeEach(async () => {
  shutdowns = 0;
  panels = [];
  logs = [];
  openImage.mockClear();
  bridge = new Bridge({
    send: (frame, key) => http.send(frame, key),
    token: ROOT,
    extensionIds: [EXT_ID],
    serverVersion: "0.0.1-test",
    log: () => {},
  });
  http = createHttpBridge({
    bridge,
    port: 0,
    identity: { name: "test", version: "0.0.0-test" },
    heartbeatMs: 10,
    log: (message) => logs.push(message),
    onShutdown: () => {
      shutdowns += 1;
    },
    openLocalImage: openImage,
  });
  await new Promise<void>((r) => http.server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(http.server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  await Promise.all(panels.map((close) => close()));
  await http.close();
});

const openFile = (body: Record<string, unknown>): Promise<Response> =>
  fetch(`${base}/bridge/file`, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/json" },
    body: JSON.stringify({ path: "/nowhere/nothing.png", ...body }),
  });

const openPanel = async (
  token: string,
  browserId?: string,
): Promise<{
  sessionId: string;
  nextRequestId: () => Promise<string>;
  close: () => Promise<void>;
}> => {
  const handshake = await fetch(`${base}/bridge/hello`, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/json" },
    body: JSON.stringify(hello(token, browserId)),
  });
  const ack = (await handshake.json()) as ReturnType<typeof bridge.handshake>;
  if (ack.t !== "hello_ack") throw new Error(ack.message);
  const response = await fetch(
    `${base}/bridge/events?session=${encodeURIComponent(ack.sessionId)}`,
    { headers: { origin: ORIGIN, authorization: `Bearer ${token}` } },
  );
  expect(response.status).toBe(200);
  const reader = response.body?.getReader();
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
  const close = async (): Promise<void> => {
    await reader?.cancel().catch(() => {});
  };
  panels.push(close);
  return { sessionId: ack.sessionId, nextRequestId, close };
};

const errorOf = async (response: Response): Promise<string | undefined> =>
  ((await response.json()) as { error?: string }).error;

async function mintFileRequest(
  panel: Awaited<ReturnType<typeof openPanel>>,
  path: string,
  tool: "editor_insert_image" | "gallery_image_add" = "editor_insert_image",
): Promise<{ requestId: string; pending: Promise<unknown> }> {
  const pending = bridge
    .callTool(tool, { path }, "brw-a")
    .catch(() => undefined);
  return { requestId: await panel.nextRequestId(), pending };
}

const shutdown = (token: string): Promise<Response> =>
  fetch(`${base}/mcp/shutdown`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  });

describe("파일 경로", () => {
  it("아무도 안 붙어 있으면 루트 토큰으로도 열리지 않는다", async () => {
    expect((await openFile({ token: ROOT })).status).toBe(403);
    expect(openImage).not.toHaveBeenCalled();
  });

  it("rejects a handshake without an open stream", async () => {
    bridge.handshake(hello(ROOT), ORIGIN);
    const response = await openFile({ token: ROOT });
    expect(response.status).toBe(403);
    expect(await errorOf(response)).toBe("unauthorized");
  });

  // A handshake that names no browser cannot be addressed by any call, so it
  // is refused rather than given a slot nothing can reach.
  it("이름 없는 악수는 세션을 열 수 없다", async () => {
    await expect(openPanel(ROOT)).rejects.toThrow();
    expect(openImage).not.toHaveBeenCalled();
  });

  it("requires a request-bound permit for a capable claimed session", async () => {
    const panel = await openPanel(OWN, "brw-a");
    expect(
      (
        await openFile({
          token: OWN,
          sessionId: panel.sessionId,
        })
      ).status,
    ).toBe(403);
  });

  it("preserves the approved file name, type, length, and no-store headers", async () => {
    const dir = await mkdtemp(join(tmpdir(), "file-route-ok-"));
    const path = join(dir, "photo.png");
    const bytes = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from("image"),
    ]);
    await writeFile(path, bytes);
    const panel = await openPanel(OWN, "brw-a");
    const { requestId, pending } = await mintFileRequest(panel, path);

    const response = await openFile({
      token: OWN,
      sessionId: panel.sessionId,
      requestId,
      tool: "editor_insert_image",
      path,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-length")).toBe(String(bytes.length));
    expect(decodeURIComponent(response.headers.get("x-file-name") ?? "")).toBe(
      "photo.png",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
    await panel.close();
    await pending;
    await rm(dir, { recursive: true, force: true });
  });

  it("붙어 있지 않으면 열리지 않는다", async () => {
    expect((await openFile({ token: OWN })).status).toBe(403);
  });

  it("모르는 토큰은 열지 못한다", async () => {
    const panel = await openPanel(OWN, "brw-a");
    expect(
      (
        await openFile({
          token: "nope-but-long-enough-to-be-a-token",
          sessionId: panel.sessionId,
        })
      ).status,
    ).toBe(403);
  });

  it("rejects an unknown request id", async () => {
    const panel = await openPanel(OWN, "brw-a");
    const response = await openFile({
      token: OWN,
      sessionId: panel.sessionId,
      requestId: "not-a-pending-request",
    });
    expect(response.status).toBe(403);
    expect(await errorOf(response)).toBe("unauthorized");
  });

  it("binds a pending request id to its session", async () => {
    const panel = await openPanel(OWN, "brw-a");
    const pending = bridge
      .callTool(
        "editor_insert_image",
        { path: "/nowhere/nothing.png" },
        "brw-a",
      )
      .catch(() => undefined);
    const requestId = await panel.nextRequestId();
    const body = {
      token: OWN,
      sessionId: panel.sessionId,
      requestId,
      tool: "editor_insert_image",
    };
    expect((await openFile(body)).status).toBe(400);
    const trace = logs.find((line) => line.includes("open=entered"));
    expect(trace).toContain("credential=claimed_browser");
    expect(trace).toContain("browser=brw-a");
    expect(trace).toContain(`session=${panel.sessionId}`);
    expect(trace).toContain(`request=${requestId}`);
    expect(trace).not.toContain(OWN);
    const replay = await openFile(body);
    expect(replay.status).toBe(403);
    expect(await errorOf(replay)).toBe("unauthorized");
    await panel.close();
    await pending;
  });

  it("rejects a permit replayed for a different path or tool before file open", async () => {
    const panel = await openPanel(OWN, "brw-a");
    const { requestId, pending } = await mintFileRequest(
      panel,
      "/nowhere/nothing.png",
    );
    openImage.mockClear();
    for (const body of [
      {
        token: OWN,
        sessionId: panel.sessionId,
        requestId,
        tool: "editor_insert_image",
        path: "/different.png",
      },
      {
        token: OWN,
        sessionId: panel.sessionId,
        requestId,
        tool: "gallery_image_add",
      },
    ]) {
      expect((await openFile(body)).status).toBe(403);
    }
    expect(openImage).not.toHaveBeenCalled();
    await panel.close();
    await pending;
  });

  it("keeps a file permit through an awaiting-confirm response", async () => {
    const panel = await openPanel(OWN, "brw-a");
    const pending = bridge.callTool(
      "editor_insert_image",
      { path: "/nowhere/nothing.png" },
      "brw-a",
    );
    const requestId = await panel.nextRequestId();
    const reply = await fetch(`${base}/bridge/result`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${OWN}`,
      },
      body: JSON.stringify({
        t: "res",
        id: requestId,
        ok: true,
        result: { status: "awaiting_confirm", ticket: "ticket-1" },
        route: { browserId: "brw-a" },
      }),
    });
    expect(reply.status).toBe(202);
    await expect(pending).resolves.toMatchObject({
      result: { status: "awaiting_confirm" },
    });
    expect(
      (
        await openFile({
          token: OWN,
          sessionId: panel.sessionId,
          requestId,
          tool: "editor_insert_image",
        })
      ).status,
    ).toBe(400);
    await panel.close();
  });

  it("rejects a session immediately after its stream closes", async () => {
    const panel = await openPanel(OWN, "brw-a");
    await panel.close();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const response = await openFile({
      token: OWN,
      sessionId: panel.sessionId,
    });
    expect(response.status).toBe(403);
    expect(await errorOf(response)).toBe("unauthorized");
  });

  it("destroys an in-flight file stream when its browser disconnects", async () => {
    const source = new PassThrough();
    source.write(Buffer.from("image"));
    openImage.mockResolvedValueOnce({
      ok: true,
      stream: source,
      contentType: "image/png",
      byteLength: 64,
      fileName: "image.png",
    });
    const panel = await openPanel(OWN, "brw-a");
    const path = "/private/image.png";
    const { requestId, pending } = await mintFileRequest(panel, path);
    const response = await openFile({
      token: OWN,
      sessionId: panel.sessionId,
      requestId,
      tool: "editor_insert_image",
      path,
    });
    expect(response.status).toBe(200);

    await panel.close();
    await vi.waitFor(() => expect(source.destroyed).toBe(true));
    await response.body?.cancel().catch(() => {});
    await pending;
  });

  it("preserves the incumbent file session until its stream detaches", async () => {
    const oldPanel = await openPanel(OWN, "brw-a");
    const contender = await fetch(`${base}/bridge/hello`, {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify(hello(OWN, "brw-a")),
    });
    expect(contender.status).toBe(403);
    expect(await contender.json()).toMatchObject({
      t: "hello_nack",
      reason: "session_active",
    });
    expect(bridge.isSessionStreamActive("brw-a", oldPanel.sessionId)).toBe(
      true,
    );

    await oldPanel.close();
    const replacement = await fetch(`${base}/bridge/hello`, {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify(hello(OWN, "brw-a")),
    });
    expect(replacement.status).toBe(200);
    const next = (await replacement.json()) as { sessionId: string };
    expect(next.sessionId).not.toBe(oldPanel.sessionId);
  });

  /**
   * Rotating the key is how a browser is put out, and the session it left
   * behind must not keep the route open on the old value.
   */
  it("키를 바꾸면 옛 키로는 못 연다", async () => {
    const rotated = "rotated-pairing-token-that-is-long-enough";
    const panel = await openPanel(OWN, "brw-a");

    expect(
      (await openFile({ token: rotated, sessionId: panel.sessionId })).status,
    ).toBe(403);
  });
});

describe("health 경로", () => {
  it("health는 고정 서버 identity 계약을 반환한다", async () => {
    const response = await fetch(`${base}/bridge/health`);

    await expect(response.json()).resolves.toEqual({
      name: MCP_SERVER_HEALTH_NAME,
      version: "0.0.0-test",
      schema: MCP_SERVER_HEALTH_SCHEMA,
    });
  });
});

describe("종료 경로", () => {
  it("루트 토큰은 데몬을 세운다", async () => {
    expect((await shutdown(ROOT)).status).toBe(200);
    expect(shutdowns).toBe(1);
  });

  it("키가 아니면 못 세운다", async () => {
    bridge.handshake(hello(OWN, "brw-a"), ORIGIN);
    expect((await shutdown("z".repeat(64))).status).toBe(403);
    expect(shutdowns).toBe(0);
  });
});
