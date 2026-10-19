import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BROWSER_ROUTING_CAPABILITY,
  BRIDGE_AUTH_CAPABILITY,
  LOCAL_FILE_REQUEST_CAPABILITY,
} from "@modootoday/datalab-extension-app-mcp-core";

import { Bridge } from "../src/bridge.js";
import { createArtifactStore } from "../src/artifact-store.js";
import { createHttpBridge, type HttpBridge } from "../src/http.js";

/**
 * An export comes back only through the save call that is in flight: its
 * permit names the job, and a read-file permit never opens this door.
 */
const ROOT = "pairing-token-that-is-long-enough-32";
const EXT_ID = "a".repeat(32);
const ORIGIN = `chrome-extension://${EXT_ID}`;

let http: HttpBridge;
let bridge: Bridge;
let base = "";
let root = "";
let closers: Array<() => Promise<void>> = [];

beforeEach(async () => {
  closers = [];
  root = await mkdtemp(join(tmpdir(), "artifact-route-"));
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
    artifactStore: createArtifactStore({ root }),
  });
  await new Promise<void>((r) => http.server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(http.server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  await Promise.all(closers.map((close) => close()));
  await http.close();
  await rm(root, { recursive: true, force: true });
});

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
  const ack = (await handshake.json()) as { t: string; sessionId: string };
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

const post = (path: string, body: Record<string, unknown>): Promise<Response> =>
  fetch(`${base}${path}`, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("/bridge/artifact", () => {
  it("saves an export for the save call in flight and nothing else", async () => {
    const panel = await openPanel();
    void bridge
      .callTool(
        "datalab_call",
        {
          tool: "gallery_export_save",
          args: { job: "pe-job-1" },
        },
        "brw-a",
      )
      .catch(() => undefined);
    const requestId = await panel.nextRequestId();
    const common = {
      token: ROOT,
      sessionId: panel.sessionId,
      requestId,
      tool: "gallery_export_save",
      name: "card.png",
    };
    const data = Buffer.from("png-bytes");

    const wrongJob = await post("/bridge/artifact", {
      ...common,
      job: "pe-job-2",
      offset: 0,
      data: data.toString("base64"),
      final: true,
    });
    expect(wrongJob.status).toBe(403);

    const wrongTool = await post("/bridge/artifact", {
      ...common,
      tool: "gallery_image_add",
      job: "pe-job-1",
      offset: 0,
      data: data.toString("base64"),
      final: true,
    });
    expect(wrongTool.status).toBe(403);

    const readAttempt = await post("/bridge/file", {
      token: ROOT,
      sessionId: panel.sessionId,
      requestId,
      tool: "gallery_export_save",
      path: "artifact:pe-job-1",
    });
    expect(readAttempt.status).toBe(403);

    const saved = await post("/bridge/artifact", {
      ...common,
      job: "pe-job-1",
      offset: 0,
      data: data.toString("base64"),
      final: true,
      bytes: data.length,
      sha256: createHash("sha256").update(data).digest("hex"),
    });
    expect(saved.status).toBe(200);
    const out = (await saved.json()) as { state: string; path: string };
    expect(out.state).toBe("saved");
    expect(out.path.startsWith(root)).toBe(true);
    expect(await readFile(out.path, "utf8")).toBe("png-bytes");
  });

  it("refuses a body without the call's identity", async () => {
    const res = await post("/bridge/artifact", {
      job: "x",
      offset: 0,
      data: "",
    });
    expect(res.status).toBe(403);
  });
});
