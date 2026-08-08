/**
 * 🔴 One abandoned request must not become everyone's outage. A client may
 * disappear mid-request, and writing to its gone socket throws; an unhandled
 * rejection ends the process every other app is sharing. Racing a real
 * disconnect would measure the harness's timing more than the behaviour, so
 * the write helper is exercised directly.
 */
import { describe, expect, it, vi } from "vitest";
import type { ServerResponse } from "node:http";

import { writeSafely } from "../src/http.js";

/** A response whose socket has gone, so writes throw as the real one would. */
function deadResponse(): ServerResponse {
  return {
    writableEnded: false,
    destroyed: false,
    writeHead: () => {
      throw new Error("write after end");
    },
    end: () => {
      throw new Error("write after end");
    },
  } as unknown as ServerResponse;
}

function liveResponse(): {
  res: ServerResponse;
  writeHead: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
} {
  const writeHead = vi.fn();
  const end = vi.fn();
  const res = {
    writableEnded: false,
    destroyed: false,
    writeHead,
    end,
  } as unknown as ServerResponse;
  return { res, writeHead, end };
}

const JSON_HEADERS = { "content-type": "application/json" };

describe("떠나 버린 요청에 답하기", () => {
  it("검사 대상을 실제로 찾았다", () => {
    // The assertion is only meaningful if this response really throws.
    expect(() => deadResponse().writeHead(200, {})).toThrow();
  });

  it("🔴 끊긴 소켓에 쓰다 던져도 밖으로 새지 않는다", () => {
    // 🔴 A leak here becomes an unhandled rejection, which ends the process:
    // the caller that would miss its answer has already left, and every other
    // connection dies with it.
    expect(() => {
      writeSafely(deadResponse(), 200, JSON_HEADERS, "{}");
    }).not.toThrow();
  });

  it("이미 끝난 응답에는 손대지 않는다", () => {
    const { res, writeHead, end } = liveResponse();
    (res as { writableEnded: boolean }).writableEnded = true;
    writeSafely(res, 200, JSON_HEADERS, "{}");
    expect(writeHead).not.toHaveBeenCalled();
    expect(end).not.toHaveBeenCalled();
  });

  it("파기된 응답에도 손대지 않는다", () => {
    const { res, writeHead } = liveResponse();
    (res as { destroyed: boolean }).destroyed = true;
    writeSafely(res, 200, JSON_HEADERS, "{}");
    expect(writeHead).not.toHaveBeenCalled();
  });

  it("살아 있는 응답에는 상태·헤더·본문을 그대로 쓴다", () => {
    const { res, writeHead, end } = liveResponse();
    writeSafely(res, 404, JSON_HEADERS, '{"error":"nope"}');
    expect(writeHead).toHaveBeenCalledWith(404, JSON_HEADERS);
    expect(end).toHaveBeenCalledWith('{"error":"nope"}');
  });
});
