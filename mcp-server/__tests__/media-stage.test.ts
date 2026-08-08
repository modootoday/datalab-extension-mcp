/**
 * The staging contract, as acceptance criteria.
 *
 * 🔴 The daemon receives bytes it did not make and seals them. Everything here
 * defends one of two things: that a sealed asset never changes, and that a state
 * nobody can prove is reported as unknown rather than folded into success — the
 * fold is what turned an incident into a run that reported COMPLETE while files
 * were still arriving.
 *
 * Real filesystem, temp root, same as local-file's tests: what is being checked
 * is where bytes land and whether they stay put, which a fake cannot answer.
 */
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMediaStage, type MediaStage } from "../src/media-stage.js";

let root = "";
let stage: MediaStage;

const JOB = {
  blogId: "minago_",
  runId: "run-1",
  slot: "slot-a",
  actionId: "act-1",
  fence: 3,
  jobId: "job-1",
};

const BYTES = Buffer.from("가을에 읽기 좋은 책 — 사진 바이트", "utf8");
const OTHER = Buffer.from("완전히 다른 바이트", "utf8");

/** SHA-256 of a buffer, the same way commit will compute it. */
async function sha(buf: Buffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** begin → upload → commit, the whole happy path. */
async function seal(
  job = JOB,
  bytes = BYTES,
): Promise<Awaited<ReturnType<MediaStage["commit"]>>> {
  const begun = await stage.begin({ ...job, declaredBytes: bytes.byteLength });
  if (begun.state !== "OPEN") throw new Error(`begin gave ${begun.state}`);
  await stage.receiveUpload(begun.uploadToken, Readable.from([bytes]));
  return stage.commit({
    ...job,
    sha256: await sha(bytes),
    bytes: bytes.byteLength,
  });
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "media-stage-"));
  stage = createMediaStage({ root });
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("자리 열기", () => {
  it("🔴 같은 jobId 로 10번 열어도 자리는 하나, token 도 같다", async () => {
    const first = await stage.begin({ ...JOB, declaredBytes: 10 });
    for (let i = 0; i < 9; i++) {
      const again = await stage.begin({ ...JOB, declaredBytes: 10 });
      expect(again.state).toBe("OPEN");
      if (again.state === "OPEN" && first.state === "OPEN") {
        expect(again.uploadToken).toBe(first.uploadToken);
      }
    }
  });

  it("경로를 돌려주지 않는다", async () => {
    const begun = await stage.begin({ ...JOB, declaredBytes: 10 });
    expect(JSON.stringify(begun)).not.toContain(root);
  });
});

describe("봉인", () => {
  it("검증을 통과하면 SEALED 와 불투명 handle 을 준다", async () => {
    const out = await seal();
    expect(out.state).toBe("SEALED");
    if (out.state !== "SEALED") return;
    expect(out.handle.startsWith("stage:")).toBe(true);
    // 🔴 A path here would hand back what the ownership agreement took away.
    expect(out.handle).not.toContain(root);
    expect(out.handle).not.toContain("/");
  });

  it("🔴 같은 바이트로 10번 commit 해도 handle 이 같고 자산은 하나다", async () => {
    const first = await seal();
    if (first.state !== "SEALED") throw new Error("not sealed");
    for (let i = 0; i < 9; i++) {
      const again = await stage.commit({
        ...JOB,
        sha256: await sha(BYTES),
        bytes: BYTES.byteLength,
      });
      expect(again.state).toBe("SEALED");
      if (again.state === "SEALED") expect(again.handle).toBe(first.handle);
    }
    expect(await stage.assetCount()).toBe(1);
  });

  /** 🔴 The sealed bytes are the record; a second writer must not become it. */
  it("🔴 다른 바이트로 덮으려 하면 거부하고 원본은 그대로다", async () => {
    const first = await seal();
    if (first.state !== "SEALED") throw new Error("not sealed");

    const refused = await stage.commit({
      ...JOB,
      sha256: await sha(OTHER),
      bytes: OTHER.byteLength,
    });
    expect(refused).toMatchObject({ reason: "already_sealed" });

    const stored = await stage.readSealed(first.handle);
    expect(stored.equals(BYTES)).toBe(true);
  });

  it("🔴 선언과 실측이 다르면 봉인하지 않는다", async () => {
    const begun = await stage.begin({
      ...JOB,
      declaredBytes: BYTES.byteLength,
    });
    if (begun.state !== "OPEN") throw new Error("not open");
    await stage.receiveUpload(begun.uploadToken, Readable.from([BYTES]));

    const out = await stage.commit({
      ...JOB,
      sha256: await sha(OTHER), // 받은 것과 다른 해시를 주장한다
      bytes: BYTES.byteLength,
    });
    expect(out).toMatchObject({ reason: "hash_mismatch" });
    expect((await stage.status(JOB)).state).not.toBe("SEALED");
  });

  it("크기가 어긋나도 봉인하지 않는다", async () => {
    const begun = await stage.begin({
      ...JOB,
      declaredBytes: BYTES.byteLength,
    });
    if (begun.state !== "OPEN") throw new Error("not open");
    await stage.receiveUpload(begun.uploadToken, Readable.from([BYTES]));
    const out = await stage.commit({
      ...JOB,
      sha256: await sha(BYTES),
      bytes: BYTES.byteLength + 1,
    });
    expect(out).toMatchObject({ reason: "hash_mismatch" });
  });
});

describe("업로드 token", () => {
  it("🔴 만료된 token 으로는 바이트가 한 개도 들어오지 않는다", async () => {
    const shortLived = createMediaStage({ root, tokenTtlMs: 1 });
    const begun = await shortLived.begin({ ...JOB, declaredBytes: 10 });
    if (begun.state !== "OPEN") throw new Error("not open");
    await new Promise((r) => setTimeout(r, 5));

    const out = await shortLived.receiveUpload(
      begun.uploadToken,
      Readable.from([BYTES]),
    );
    expect(out).toMatchObject({ ok: false, reason: "upload_expired" });
    expect((await shortLived.status(JOB)).bytesReceived).toBe(0);
  });

  it("모르는 token 은 거부한다", async () => {
    const out = await stage.receiveUpload("nope", Readable.from([BYTES]));
    expect(out).toMatchObject({ ok: false });
  });
});

describe("fence", () => {
  it("🔴 더 새로운 fence 가 지나간 뒤의 옛 시도는 거부한다", async () => {
    await stage.begin({ ...JOB, fence: 5, declaredBytes: 10 });
    const old = await stage.begin({ ...JOB, fence: 3, declaredBytes: 10 });
    expect(old).toMatchObject({ reason: "stale_fence" });
  });

  it("같은 fence 는 같은 시도다 — 거부하지 않는다", async () => {
    await stage.begin({ ...JOB, fence: 5, declaredBytes: 10 });
    const same = await stage.begin({ ...JOB, fence: 5, declaredBytes: 10 });
    expect(same.state).toBe("OPEN");
  });
});

describe("취소", () => {
  it("스트림이 모두 닫혔음을 확인하면 CANCELLED 다", async () => {
    await stage.begin({ ...JOB, declaredBytes: 10 });
    const out = await stage.cancel(JOB);
    expect(out).toMatchObject({ state: "CANCELLED", activeUploads: 0 });
  });

  /** 🔴 The whole reason this state exists. */
  it("🔴 스트림이 살아 있으면 성공이 아니라 STATE_UNKNOWN 이다", async () => {
    const begun = await stage.begin({ ...JOB, declaredBytes: 10 });
    if (begun.state !== "OPEN") throw new Error("not open");

    // A stream that never ends, so the upload is genuinely still in flight.
    const stuck = new Readable({ read() {} });
    void stage.receiveUpload(begun.uploadToken, stuck);
    await new Promise((r) => setTimeout(r, 5));

    const out = await stage.cancel(JOB);
    expect(out.state).toBe("STATE_UNKNOWN");
    expect(out).toMatchObject({ reason: "uploads_unproven", retryable: true });
    stuck.push(null);
  });

  it("🔴 봉인된 것은 취소되지 않는다", async () => {
    await seal();
    expect(await stage.cancel(JOB)).toMatchObject({ reason: "already_sealed" });
  });
});

describe("상태", () => {
  it("원장이 통째로 사라지면 완료로 추정하지 않는다", async () => {
    await seal();
    await rm(join(root, "ledger"), { recursive: true, force: true });
    expect((await stage.status(JOB)).state).toBe("STATE_UNKNOWN");
  });

  /**
   * 🔴 Absent and unreadable are different answers, and only the second is
   * ambiguous. A truncated write leaves a file that exists and cannot be
   * parsed — reading that as "never opened" is the fold this state exists to
   * prevent.
   */
  it("🔴 원장이 깨져서 못 읽히면 STATE_UNKNOWN 이다 — 부재로 접지 않는다", async () => {
    await seal();
    const [ledger] = (await stage.debugWrittenPaths()).filter((p) =>
      p.includes("ledger"),
    );
    await writeFile(ledger!, "{ 깨진 JSON", "utf8");
    expect((await stage.status(JOB)).state).toBe("STATE_UNKNOWN");
  });

  it("🔴 깨진 원장 위에서는 commit 도 성공을 지어내지 않는다", async () => {
    await stage.begin({ ...JOB, declaredBytes: BYTES.byteLength });
    const [ledger] = (await stage.debugWrittenPaths()).filter((p) =>
      p.includes("ledger"),
    );
    await writeFile(ledger!, "{ 깨진 JSON", "utf8");
    const out = await stage.commit({
      ...JOB,
      sha256: await sha(BYTES),
      bytes: BYTES.byteLength,
    });
    expect(out.state).not.toBe("SEALED");
    expect(out).toMatchObject({ reason: "uploads_unproven", retryable: true });
  });

  /** 🔴 Restarting must never invent a seal that was never made. */
  it("🔴 강제 종료 뒤 다시 물어도 SEALED 를 지어내지 않는다", async () => {
    const begun = await stage.begin({
      ...JOB,
      declaredBytes: BYTES.byteLength,
    });
    if (begun.state !== "OPEN") throw new Error("not open");
    await stage.receiveUpload(begun.uploadToken, Readable.from([BYTES]));

    // A fresh daemon over the same root: nothing in memory survives.
    const reborn = createMediaStage({ root });
    const after = await reborn.status(JOB);
    expect(["OPEN", "STATE_UNKNOWN"]).toContain(after.state);
    expect(after.state).not.toBe("SEALED");
  });

  it("봉인 뒤 재시작해도 SEALED 를 기억한다", async () => {
    const out = await seal();
    if (out.state !== "SEALED") throw new Error("not sealed");
    const reborn = createMediaStage({ root });
    const after = await reborn.status(JOB);
    expect(after.state).toBe("SEALED");
  });
});

describe("응답에 새지 않는 것", () => {
  it("🔴 어떤 응답에도 파일시스템 경로가 없다", async () => {
    const sealed = await seal();
    const bodies = [
      JSON.stringify(await stage.begin({ ...JOB, declaredBytes: 10 })),
      JSON.stringify(sealed),
      JSON.stringify(await stage.status(JOB)),
    ];
    for (const body of bodies) {
      expect(body).not.toContain(root);
      expect(body).not.toContain(tmpdir());
    }
  });

  it("🔴 어떤 응답에도 base64 바이트가 없다", async () => {
    const sealed = await seal();
    const body =
      JSON.stringify(sealed) + JSON.stringify(await stage.status(JOB));
    expect(body).not.toContain(BYTES.toString("base64"));
    expect(body).not.toContain("data:");
  });
});

describe("바이트는 루트 안에만 쓰인다", () => {
  it("🔴 호출자가 준 어떤 문자열도 경로가 되지 않는다", async () => {
    const hostile = {
      ...JOB,
      blogId: "../../etc",
      runId: "..",
      actionId: "/absolute",
      jobId: "../escape",
    };
    const begun = await stage.begin({ ...hostile, declaredBytes: 10 });
    // Either refused outright, or accepted with everything still under root.
    if (begun.state === "OPEN") {
      await stage.receiveUpload(begun.uploadToken, Readable.from([BYTES]));
      const written = await stage.debugWrittenPaths();
      for (const p of written) expect(p.startsWith(root)).toBe(true);
    } else {
      expect(begun).toMatchObject({ reason: expect.any(String) });
    }
  });
});

/** Sanity: the fixture writes real bytes to a real disk. */
it("임시 루트가 실제로 쓰인다", async () => {
  const probe = join(root, "probe");
  await writeFile(probe, "x");
  expect((await readFile(probe, "utf8")).length).toBe(1);
});
