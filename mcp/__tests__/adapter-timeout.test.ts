/**
 * 🔴 A daemon that stops answering must not take the host's turn with it. Every
 * request rides one await, and without a ceiling a wedged connector holds it
 * for the life of the process — no answer, no error, no way to move on. The
 * two failures also need different advice: refused means the connector is
 * absent, silent means it is there and stuck.
 */
import { describe, expect, it } from "vitest";

import {
  createAdapterServer,
  POST_TIMEOUT_MS,
  type FetchImpl,
} from "../src/adapter.js";
import {
  BRIDGE_USER_MESSAGES,
  REQUEST_DEADLINE_MS,
} from "@modootoday/extension-app-mcp-core";

type Handler = (req: unknown, extra: unknown) => Promise<unknown>;

function handlers(
  server: ReturnType<typeof createAdapterServer>,
): Map<string, Handler> {
  return (server as unknown as { _requestHandlers: Map<string, Handler> })
    ._requestHandlers;
}

/**
 * A fetch that fails the way a wedged connector does. It rejects at once
 * rather than waiting out the real ceiling: the behaviour under test is what
 * happens with a timeout, not that the timer itself works.
 */
const timedOutFetch: FetchImpl = async () => {
  throw namedError("TimeoutError");
};

/** Some runtimes name the same condition AbortError. */
const abortNamedFetch: FetchImpl = async () => {
  throw namedError("AbortError");
};

function namedError(name: string): Error {
  const err = new Error("aborted");
  err.name = name;
  return err;
}

/** A fetch that fails the way an absent connector does — refused, at once. */
const refusedFetch: FetchImpl = async () => {
  throw new Error("connect ECONNREFUSED 127.0.0.1:8765");
};

async function callTool(fetchImpl: FetchImpl): Promise<{
  content: { text: string }[];
  isError?: boolean;
}> {
  const server = createAdapterServer({ fetchImpl, log: () => {} });
  const handler = handlers(server).get("tools/call");
  const out = await handler!(
    { method: "tools/call", params: { name: "keyword_trend", arguments: {} } },
    {},
  );
  return out as { content: { text: string }[]; isError?: boolean };
}

describe("연결 프로그램이 응답하지 않을 때", () => {
  it("🔴 요청에 상한을 건다 — 상한이 없으면 호스트의 턴이 영영 멈춘다", async () => {
    let sawSignal = false;
    const probe: FetchImpl = async (_url, init) => {
      sawSignal = init.signal instanceof AbortSignal;
      return { text: async () => JSON.stringify({ result: { content: [] } }) };
    };
    await callTool(probe);
    expect(sawSignal, "POST 에 중단 신호가 실리지 않았다").toBe(true);
  });

  it("🔴 상한이 지나면 결과로 돌려준다 — 던지면 모델이 아무것도 못 한다", async () => {
    const out = await callTool(timedOutFetch);
    expect(out.isError).toBe(true);
    expect(out.content[0]?.text.length ?? 0).toBeGreaterThan(0);
  });

  it("🔴 멈춘 경우와 없는 경우의 안내가 다르다", async () => {
    const stuck = (await callTool(timedOutFetch)).content[0]!.text;
    const absent = (await callTool(refusedFetch)).content[0]!.text;
    expect(stuck).not.toBe(absent);
  });

  it("멈춘 경우에는 크롬을 열라고 하지 않는다", async () => {
    const stuck = (await callTool(timedOutFetch)).content[0]!.text;
    expect(stuck).toContain(BRIDGE_USER_MESSAGES.connectorStuck);
    expect(stuck).not.toContain(BRIDGE_USER_MESSAGES.panelClosed);
  });

  it("없는 경우에는 그대로 패널을 열라고 한다", async () => {
    const absent = (await callTool(refusedFetch)).content[0]!.text;
    expect(absent).toContain(BRIDGE_USER_MESSAGES.panelClosed);
  });

  it("멈춘 안내는 곧바로 재시도하지 말라고 모델에게 말한다", async () => {
    const stuck = (await callTool(timedOutFetch)).content[0]!.text;
    expect(stuck.toLowerCase()).toContain("do not retry immediately");
  });

  it("AbortError 로 오는 런타임에서도 같은 안내가 나온다", async () => {
    const stuck = (await callTool(abortNamedFetch)).content[0]!.text;
    expect(stuck).toContain(BRIDGE_USER_MESSAGES.connectorStuck);
  });

  it("상한은 데몬의 요청 마감보다 길다 — 느린 도구를 여기서 자르면 안 된다", () => {
    expect(POST_TIMEOUT_MS).toBeGreaterThan(REQUEST_DEADLINE_MS);
  });
});
