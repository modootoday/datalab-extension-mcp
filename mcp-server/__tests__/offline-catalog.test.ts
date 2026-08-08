/**
 * What a host is handed before the browser is up.
 *
 * 🔴 Many hosts cache the first tool list they receive and ignore
 * list-changed, so whatever is answered while the panel is down is what the
 * user has for the session. The `datalab_*` façade exists precisely to fill
 * that window: five fixed names that route to everything else once the panel
 * connects.
 *
 * 🔴 The regression this pins: the fallback was guarded by "no cached tools AND
 * no daemon-owned tools". That was true until the media staging tools existed;
 * after them it was never true again, so the façade stopped being served and a
 * host connecting first was given FOUR tools and cached them. The catalog
 * itself was never wrong — it was simply never sent.
 */
import { mkdtemp, rm } from "node:fs/promises";
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
  /** 🔴 The exact user-visible symptom: four tools and nothing else. */
  it("🔴 staging 도구가 있어도 datalab_* 파사드를 함께 준다", async () => {
    const names = await listTools(coldBridge(), true);

    expect(names).toEqual(
      expect.arrayContaining([
        "datalab_catalog",
        "datalab_describe",
        "datalab_call",
        "datalab_confirm_status",
        "datalab_session_state",
      ]),
    );
    expect(names.filter((n) => n.startsWith("media_stage_"))).toHaveLength(4);
  });

  it("staging 이 없는 빌드에서는 파사드만 준다", async () => {
    const names = await listTools(coldBridge(), false);
    expect(names.every((n) => n.startsWith("datalab_"))).toBe(true);
    expect(names).toHaveLength(5);
  });

  /**
   * 🔴 Never empty. An empty success is cached exactly like a real answer, and
   * nothing on our side can undo it for the rest of the session.
   */
  it("🔴 어떤 조합에서도 빈 목록을 주지 않는다", async () => {
    for (const withStage of [true, false]) {
      expect((await listTools(coldBridge(), withStage)).length).toBeGreaterThan(
        0,
      );
    }
  });
});

describe("패널을 봤다가 놓쳤을 때", () => {
  /**
   * 🔴 The cached catalog wins over the façade — it is the real one, and
   * replacing it with five router names would shrink what the host can call.
   */
  it("🔴 마지막으로 받은 목록을 쓰고, 파사드로 덮지 않는다", async () => {
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
