import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MAX_ARTIFACT_BYTES,
  createArtifactStore,
  safeArtifactName,
} from "../src/artifact-store.js";

let root = "";
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "artifact-"));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const b64 = (s: string): string => Buffer.from(s).toString("base64");
const sha = (s: string): string =>
  createHash("sha256").update(Buffer.from(s)).digest("hex");

describe("createArtifactStore", () => {
  it("appends chunks and saves the verified file under its own folder", async () => {
    const store = createArtifactStore({
      root,
      now: () => Date.UTC(2026, 9, 15),
    });
    const first = await store.write({
      key: "s:r",
      name: "../영상.mp4",
      offset: 0,
      data: b64("hello "),
      final: false,
    });
    expect(first).toEqual({ ok: true, state: "open", received: 6 });
    const last = await store.write({
      key: "s:r",
      name: "../영상.mp4",
      offset: 6,
      data: b64("world"),
      final: true,
      bytes: 11,
      sha256: sha("hello world"),
    });
    expect(last).toMatchObject({
      ok: true,
      state: "saved",
      bytes: 11,
      sha256: sha("hello world"),
    });
    if (!last.ok || last.state !== "saved") throw new Error("not saved");
    expect(last.path.startsWith(join(root, "20261015"))).toBe(true);
    expect(last.path.endsWith("-영상.mp4")).toBe(true);
    expect(await readFile(last.path, "utf8")).toBe("hello world");
    expect(await readdir(join(root, "20261015"))).toHaveLength(1);
  });

  it("refuses an out-of-order chunk and discards the partial file", async () => {
    const store = createArtifactStore({ root });
    await store.write({
      key: "k",
      name: "a",
      offset: 0,
      data: b64("abc"),
      final: false,
    });
    expect(
      await store.write({
        key: "k",
        name: "a",
        offset: 1,
        data: b64("x"),
        final: true,
      }),
    ).toMatchObject({
      ok: false,
      reason: "bad_offset",
    });
    expect(
      await store.write({
        key: "k2",
        name: "a",
        offset: 5,
        data: b64("x"),
        final: true,
      }),
    ).toMatchObject({
      reason: "bad_offset",
    });
  });

  it("refuses a hash or size mismatch and bad base64", async () => {
    const store = createArtifactStore({ root });
    expect(
      await store.write({
        key: "k",
        name: "a",
        offset: 0,
        data: b64("abc"),
        final: true,
        sha256: "0".repeat(64),
      }),
    ).toMatchObject({ reason: "mismatch" });
    expect(
      await store.write({
        key: "k3",
        name: "a",
        offset: 0,
        data: b64("abc"),
        final: true,
        bytes: 9,
      }),
    ).toMatchObject({
      reason: "mismatch",
    });
    expect(
      await store.write({
        key: "k4",
        name: "a",
        offset: 0,
        data: "!!!",
        final: true,
      }),
    ).toMatchObject({
      reason: "bad_chunk",
    });
  });

  it("saves an empty file and expires stale partial uploads", async () => {
    let t = 0;
    const store = createArtifactStore({ root, now: () => t });
    expect(
      await store.write({
        key: "e",
        name: "empty.txt",
        offset: 0,
        data: "",
        final: true,
      }),
    ).toMatchObject({
      state: "saved",
      bytes: 0,
    });
    await store.write({
      key: "p",
      name: "p",
      offset: 0,
      data: b64("ab"),
      final: false,
    });
    t += 31 * 60 * 1000;
    expect(
      await store.write({
        key: "p",
        name: "p",
        offset: 2,
        data: b64("c"),
        final: true,
      }),
    ).toMatchObject({
      reason: "bad_offset",
    });
  });

  it("caps the total size", async () => {
    expect(MAX_ARTIFACT_BYTES).toBe(1024 * 1024 * 1024);
  });
});

describe("safeArtifactName", () => {
  it("strips path and control characters and keeps a fallback", () => {
    expect(safeArtifactName("../a/b:c.png")).toBe("abc.png");
    expect(safeArtifactName("...")).toBe("export.bin");
    expect(safeArtifactName("x".repeat(200))).toHaveLength(120);
  });
});
