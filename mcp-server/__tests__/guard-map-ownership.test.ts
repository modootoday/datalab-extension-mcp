import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Three maps here own something that must be given back, and each says so in
 * a comment: a request registry whose promises would hang, a stream whose
 * lifecycle reference would never return, and the session those belong to. The
 * rule is the same in all three — one place to enter, one place to leave — and
 * in all three it is enforced by nothing but the code happening to be written
 * that way.
 *
 * They are not one helper. What each does around the map is different and
 * carries its own reason, and a shared wrapper would take those reasons away
 * from the call sites that need them. So the rule is enforced here instead: the
 * call sites keep their comments and a machine keeps the cardinality.
 *
 * Read from stripped source. A `.set(` inside a comment is not an insertion,
 * and counting one would let a real second insertion hide behind it.
 */
const SRC = join(import.meta.dirname, "..", "src");

function code(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:/])\/\/[^\n]*/g, "$1 ")
    .replace(/`(?:\\.|\$\{[^{}]*\}|[^`\\])*`/g, "``")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
}

const read = (file: string): string =>
  code(readFileSync(join(SRC, file), "utf8"));

const count = (text: string, needle: string): number =>
  text.split(needle).length - 1;

describe("소유하는 맵은 한 곳에서만 들어가고 한 곳에서만 나간다", () => {
  it("세션 — 등록부가 매달린 채 사라지지 않게", () => {
    const src = read("bridge.ts");
    expect(count(src, "#sessions.set("), "삽입 지점이 하나가 아니다").toBe(1);
    expect(count(src, "#sessions.delete("), "제거 지점이 하나가 아니다").toBe(
      1,
    );
  });

  it("스트림 — 되돌려주지 않은 참조가 데몬을 붙잡지 않게", () => {
    const src = read("http.ts");
    expect(count(src, "streams.set("), "삽입 지점이 하나가 아니다").toBe(1);
    expect(count(src, "streams.delete("), "제거 지점이 하나가 아니다").toBe(1);
  });

  /**
   * The reference and the map move together. `lifecycle.release` outside the
   * removal would double-count, and the counter clamps at zero — so it does not
   * throw, it parks the daemon on a count too low and lets it exit under a live
   * panel. One retain belongs to the adapter subscription, which is its own
   * pair and not this one.
   */
  it("스트림 참조는 맵 안에서만 오간다", () => {
    const src = read("http.ts");
    expect(count(src, "lifecycle?.release?.()")).toBe(2);
    expect(count(src, "lifecycle?.retain?.()")).toBe(2);
  });
});
