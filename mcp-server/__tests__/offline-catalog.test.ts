/**
 * Cold hosts receive six discovery tools before the browser is available.
 * The fallback must coexist with daemon-owned media tools.
 */
import { mkdtemp, rm } from "node:fs/promises";

import { DISCOVERY_TOOLS } from "@modootoday/extension-app-mcp-core";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { handleMcpRequest } from "../src/mcp-http.js";
import { createMediaStage, type MediaStage } from "../src/media-stage.js";
import type { Bridge } from "../src/bridge.js";

let root = "";
let stage: MediaStage;

/** A bridge that has never heard from a panel. */
const coldBridge = (): Bridge =>
  ({ connected: false, lastKnownTools: [] }) as unknown as Bridge;

/** A bridge that saw a panel once and then lost it. */
const warmBridge = (tools: unknown[]): Bridge =>
  ({ connected: false, lastKnownTools: tools }) as unknown as Bridge;

async function listTools(
  bridge: Bridge,
  withStage: boolean,
): Promise<string[]> {
  const res = await handleMcpRequest(
    bridge,
    { jsonrpc: "2.0", id: 1, method: "tools/list" },
    "application/json",
    withStage ? stage : undefined,
  );
  const body = JSON.parse(res.body) as {
    result: { tools: Array<{ name: string }> };
  };
  return body.result.tools.map((t) => t.name);
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "offline-catalog-"));
  stage = createMediaStage({ root });
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("패널이 한 번도 붙지 않았을 때", () => {
  /** The exact user-visible symptom: the full facade and nothing else. */
  it("staging 도구가 있어도 datalab_* 파사드를 함께 준다", async () => {
    const names = await listTools(coldBridge(), true);

    expect(names).toEqual(
      expect.arrayContaining([
        "datalab_find_tools",
        "datalab_list_tools",
        "datalab_call",
        "datalab_confirm_status",
        "datalab_session_state",
      ]),
    );
    expect(names).not.toContain("datalab_catalog");
    expect(names).not.toContain("datalab_describe");
    expect(names.filter((n) => n.startsWith("media_stage_"))).toHaveLength(4);
  });

  it("staging 이 없는 빌드에서는 파사드만 준다", async () => {
    const names = await listTools(coldBridge(), false);
    expect(names.every((n) => n.startsWith("datalab_"))).toBe(true);
    // Derived, not counted by hand: the property is "the facade and nothing
    // else", and a literal here only records how many there were the day it
    // was written.
    expect(names).toHaveLength(DISCOVERY_TOOLS.length);
  });

  /**
   * Never empty. An empty success is cached exactly like a real answer, and
   * nothing on our side can undo it for the rest of the session.
   */
  it("어떤 조합에서도 빈 목록을 주지 않는다", async () => {
    for (const withStage of [true, false]) {
      expect((await listTools(coldBridge(), withStage)).length).toBeGreaterThan(
        0,
      );
    }
  });
});

describe("패널을 봤다가 놓쳤을 때", () => {
  /** The cached live catalog must win over the smaller discovery facade. */
  it("마지막으로 받은 목록을 쓰고, 파사드로 덮지 않는다", async () => {
    const cached = [{ name: "search_blog" }, { name: "editor_read" }];
    const names = await listTools(warmBridge(cached), true);

    expect(names).toEqual(
      expect.arrayContaining(["search_blog", "editor_read"]),
    );
    expect(names).not.toContain("datalab_catalog");
  });

  it("staging 도구는 캐시와 함께 계속 나온다", async () => {
    const names = await listTools(warmBridge([{ name: "search_blog" }]), true);
    expect(names.filter((n) => n.startsWith("media_stage_"))).toHaveLength(4);
  });
});
