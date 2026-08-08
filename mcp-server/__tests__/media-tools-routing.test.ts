/**
 * The staging tools are answered by the daemon, not forwarded to the panel.
 *
 * 🔴 That is not an optimisation. The daemon owns the disk these write to, and
 * it is also the only process still alive when the browser is closed — so a run
 * can keep staging bytes with no panel attached and only need one later, for
 * the editor. Forwarding them would make an unattended job depend on a window.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleMcpRequest } from "../src/mcp-http.js";
import { createMediaStage, type MediaStage } from "../src/media-stage.js";
import { BridgeError, type Bridge } from "../src/bridge.js";

let root = "";
let stage: MediaStage;

const JOB = {
  blogId: "minago_",
  runId: "run-1",
  slot: "slot-a",
  actionId: "act-1",
  fence: 1,
  jobId: "job-1",
};

/** A bridge that behaves however the test needs; never expected to be reached. */
function stubBridge(over: Partial<Bridge> = {}): Bridge {
  return {
    listTools: vi
      .fn()
      .mockResolvedValue({ tools: [{ name: "keyword_trend" }] }),
    callTool: vi.fn().mockResolvedValue({ result: {}, bridgeMs: 1 }),
    lastKnownTools: [],
    connected: true,
    ...over,
  } as unknown as Bridge;
}

const decode = (res: { body: string }) =>
  JSON.parse(res.body) as { result?: Record<string, unknown> };

const call = async (
  bridge: Bridge,
  name: string,
  args: Record<string, unknown>,
  withStage = true,
) =>
  decode(
    await handleMcpRequest(
      bridge,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name, arguments: args },
      },
      "application/json",
      withStage ? stage : undefined,
    ),
  );

const payload = (res: { result?: Record<string, unknown> }) =>
  JSON.parse(
    (res.result?.["content"] as Array<{ text: string }>)[0]!.text,
  ) as Record<string, unknown>;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "media-tools-"));
  stage = createMediaStage({ root });
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("목록", () => {
  it("패널 도구와 함께 실린다", async () => {
    const res = decode(
      await handleMcpRequest(
        stubBridge(),
        { jsonrpc: "2.0", id: 1, method: "tools/list" },
        "application/json",
        stage,
      ),
    );
    const names = (res.result?.["tools"] as Array<{ name: string }>).map(
      (t) => t.name,
    );
    expect(names).toContain("keyword_trend");
    expect(names).toContain("media_stage_begin");
    expect(names).toContain("media_stage_commit");
    expect(names).toContain("media_stage_status");
    expect(names).toContain("media_stage_cancel");
  });

  /** 🔴 The unattended case: no browser, and staging still exists. */
  it("🔴 패널이 닫혀 있어도 목록에 남는다", async () => {
    // Not connected at all — the state an unattended run spends most of its time in.
    const dead = stubBridge({ connected: false } as never);
    const res = decode(
      await handleMcpRequest(
        dead,
        { jsonrpc: "2.0", id: 1, method: "tools/list" },
        "application/json",
        stage,
      ),
    );
    const names = (res.result?.["tools"] as Array<{ name: string }>).map(
      (t) => t.name,
    );
    expect(names).toContain("media_stage_begin");
  });

  /** A tool that cannot work must not be advertised. */
  it("🔴 stage 가 없는 빌드에는 이름 자체가 없다", async () => {
    const res = decode(
      await handleMcpRequest(
        stubBridge(),
        { jsonrpc: "2.0", id: 1, method: "tools/list" },
        "application/json",
      ),
    );
    const names = (res.result?.["tools"] as Array<{ name: string }>).map(
      (t) => t.name,
    );
    expect(names.some((n) => n.startsWith("media_stage_"))).toBe(false);
  });
});

describe("호출", () => {
  it("🔴 패널로 전달되지 않는다", async () => {
    const bridge = stubBridge();
    await call(bridge, "media_stage_begin", { ...JOB, declaredBytes: 10 });
    expect(bridge.callTool).not.toHaveBeenCalled();
  });

  it("begin 이 자리를 열고 token 을 준다", async () => {
    const out = payload(
      await call(stubBridge(), "media_stage_begin", {
        ...JOB,
        declaredBytes: 10,
      }),
    );
    expect(out).toMatchObject({ state: "OPEN" });
    expect(typeof out["uploadToken"]).toBe("string");
  });

  it("🔴 응답에 경로가 없다", async () => {
    const res = await call(stubBridge(), "media_stage_begin", {
      ...JOB,
      declaredBytes: 10,
    });
    expect(JSON.stringify(res)).not.toContain(root);
  });

  it("타이밍은 _meta 로만 나간다", async () => {
    const res = await call(stubBridge(), "media_stage_status", JOB);
    expect(res.result?.["_meta"]).toMatchObject({
      capabilityVersion: "datalab-mcp-timing-v1",
    });
    expect(payload(res)).not.toHaveProperty("toolMs");
  });

  /** 🔴 A refusal is a value, not a throw: the reason is the interface. */
  it("🔴 식별자가 빠지면 거부를 값으로 돌려준다", async () => {
    const out = payload(
      await call(stubBridge(), "media_stage_begin", { blogId: "only-this" }),
    );
    expect(out).toMatchObject({ reason: "invalid_args", retryable: false });
  });

  it("stage 가 없으면 평소처럼 패널로 간다", async () => {
    const bridge = stubBridge();
    await call(bridge, "media_stage_begin", JOB, false);
    expect(bridge.callTool).toHaveBeenCalled();
  });
});
