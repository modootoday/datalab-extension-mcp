/**
 * 🔴 An answer must never settle a request it does not belong to.
 *
 * This process is replaced routinely while the panel outlives it, so a panel
 * part-way through a slow tool can reconnect to a replacement and post its
 * answer there. A per-process counter alone would have that id name someone
 * else's live request, and both sides would see an ordinary reply.
 */
import { describe, expect, it } from "vitest";

import { PendingRegistry } from "../src/pending.js";

describe("요청 id", () => {
  it("검사 대상을 실제로 찾았다", () => {
    const reg = new PendingRegistry();
    expect(reg.nextId()).toEqual(expect.any(String));
  });

  it("한 레지스트리 안에서는 순번이 늘어난다", () => {
    const reg = new PendingRegistry({ idPrefix: "aaaa" });
    expect(reg.nextId()).toBe("aaaa-r1");
    expect(reg.nextId()).toBe("aaaa-r2");
  });

  it("🔴 새 레지스트리는 앞선 것과 같은 id 를 내지 않는다", () => {
    // A new process restarts the sequence; only the prefix keeps ids apart.
    const first = new PendingRegistry();
    const second = new PendingRegistry();
    const a = [first.nextId(), first.nextId(), first.nextId()];
    const b = [second.nextId(), second.nextId(), second.nextId()];
    expect(a.filter((id) => b.includes(id))).toEqual([]);
  });

  it("접두는 레지스트리마다 다르다", () => {
    const prefixes = new Set(
      Array.from(
        { length: 50 },
        () => new PendingRegistry().nextId().split("-")[0],
      ),
    );
    // The prefix is random, so a rare collision is expected; most being
    // distinct is the property.
    expect(prefixes.size).toBeGreaterThan(45);
  });

  it("🔴 옛 서버의 답이 새 서버의 요청을 정착시키지 못한다", async () => {
    // Post an answer into the new registry under an id the old one minted.
    const dying = new PendingRegistry({ idPrefix: "old1" });
    const staleId = dying.nextId();

    const fresh = new PendingRegistry({ idPrefix: "new1" });
    const mineId = fresh.nextId();
    const mine = fresh.register(mineId);

    const landed = fresh.settle(staleId, {
      ok: true,
      result: "다른 호출의 결과",
    });
    expect(landed, "옛 답이 새 요청에 정착했다").toBe(false);

    // Our own request must still be waiting for its own answer.
    fresh.settle(mineId, { ok: true, result: "내 결과" });
    await expect(mine).resolves.toEqual({ ok: true, result: "내 결과" });
  });

  it("접두가 같으면 막지 못한다 — 그래서 무작위다", () => {
    // 🔴 The same prefix is forced on both, showing the prefix is the whole of
    // the defence.
    const dying = new PendingRegistry({ idPrefix: "same" });
    const staleId = dying.nextId();
    const fresh = new PendingRegistry({ idPrefix: "same" });
    fresh.register(fresh.nextId());
    expect(fresh.settle(staleId, { ok: true, result: "x" })).toBe(true);
  });

  it("id 는 불투명 문자열 — 패널이 그대로 되돌려주면 매칭된다", () => {
    const reg = new PendingRegistry({ idPrefix: "bbbb" });
    const id = reg.nextId();
    const waiting = reg.register(id);
    // The panel echoes the id back without parsing it.
    const echoed = JSON.parse(JSON.stringify({ id })).id as string;
    expect(reg.settle(echoed, { ok: true, result: 1 })).toBe(true);
    return expect(waiting).resolves.toEqual({ ok: true, result: 1 });
  });
});
