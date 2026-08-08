/**
 * The boundary on what the connector will read.
 *
 * 🔴 This module grants the daemon the ability to read a path off the user's
 * disk, so it must enforce three things itself: absolute paths only, a size
 * ceiling, and image detection by CONTENT rather than by file extension — an
 * extension is a name the caller chose and proves nothing.
 */
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openLocalImage, MAX_FILE_BYTES } from "../src/local-file.js";

let dir = "";
const PNG_HEAD = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_HEAD = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "dt-localfile-"));
  await writeFile(
    join(dir, "photo.png"),
    Buffer.concat([PNG_HEAD, Buffer.alloc(64)]),
  );
  await writeFile(
    join(dir, "photo.jpg"),
    Buffer.concat([JPEG_HEAD, Buffer.alloc(64)]),
  );
  // 🔴 A secret disguised under a photo's filename, which an extension check
  // alone would wave through.
  await writeFile(
    join(dir, "secret.png"),
    "-----BEGIN OPENSSH PRIVATE KEY-----\n",
  );
  await writeFile(join(dir, "empty.png"), "");
});

afterAll(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
});

describe("openLocalImage", () => {
  it("진짜 이미지는 종류까지 알아낸다", async () => {
    const png = await openLocalImage(join(dir, "photo.png"));
    expect(png.ok).toBe(true);
    if (png.ok) {
      expect(png.contentType).toBe("image/png");
      expect(png.fileName).toBe("photo.png");
      png.stream.destroy();
    }
    const jpg = await openLocalImage(join(dir, "photo.jpg"));
    expect(jpg.ok).toBe(true);
    if (jpg.ok) {
      expect(jpg.contentType).toBe("image/jpeg");
      jpg.stream.destroy();
    }
  });

  it("🔴 이미지 이름을 쓴 이미지 아닌 파일은 거부한다", async () => {
    const out = await openLocalImage(join(dir, "secret.png"));
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe("not_an_image");
  });

  it("상대 경로는 받지 않는다 — 어느 파일이 열릴지 아무도 모른다", async () => {
    const out = await openLocalImage("photo.png");
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe("not_absolute");
  });

  it("없는 파일·빈 파일·디렉토리를 구분해 알려 준다", async () => {
    const missing = await openLocalImage(join(dir, "nope.png"));
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.reason).toBe("not_found");

    const empty = await openLocalImage(join(dir, "empty.png"));
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.reason).toBe("empty");

    const isDir = await openLocalImage(dir);
    expect(isDir.ok).toBe(false);
    if (!isDir.ok) expect(isDir.reason).toBe("not_a_file");
  });

  it("빈 경로를 던지지 않고 값으로 거절한다 — 호출부가 와이어다", async () => {
    const out = await openLocalImage("");
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe("bad_path");
  });

  it("상한이 사진 한 장 크기에 머문다", () => {
    // Raising this grows both memory and upload size — change it deliberately.
    expect(MAX_FILE_BYTES).toBe(10 * 1024 * 1024);
  });
});
