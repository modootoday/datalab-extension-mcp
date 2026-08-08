/**
 * Reads one local file — the only path by which the extension can put a photo
 * into a post. Consent is collected by the extension before this is reached.
 *
 * 🔴 This grants the daemon the ability to read a path off the user's disk, so
 * it enforces its own limits on size and content. 🔴 It knows nothing about
 * which tool is calling: a pinned connector can never be corrected, so it
 * holds no knowledge that could rot.
 */
import { createReadStream } from "node:fs";
import { open, stat } from "node:fs/promises";
import { basename, isAbsolute } from "node:path";
import type { Readable } from "node:stream";

/** Ceiling for one photo; anything larger does not belong in a post. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type LocalFileOutcome =
  | {
      ok: true;
      stream: Readable;
      contentType: string;
      byteLength: number;
      fileName: string;
    }
  | { ok: false; reason: string; message: string };

/**
 * Decide the type from the file's leading bytes.
 *
 * 🔴 The extension in the name is chosen by the caller and proves nothing, so
 * only content that really is an image passes.
 */
function sniff(head: Uint8Array): string | null {
  const b = head;
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e) {
    return "image/png";
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return "image/jpeg";
  }
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) {
    return "image/gif";
  }
  // RIFF....WEBP
  if (
    b.length >= 12 &&
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * Open a path and return a stream when it is an image. Every failure comes back
 * as a value: the caller is on the wire, where a throw would leave a request
 * unsettled.
 */
export async function openLocalImage(path: string): Promise<LocalFileOutcome> {
  if (typeof path !== "string" || !path.trim()) {
    return { ok: false, reason: "bad_path", message: "파일 경로가 없어요." };
  }
  // 🔴 Relative paths are refused: the daemon's working directory differs per
  // host and is unknown to the user, so nobody could predict which file opens.
  if (!isAbsolute(path)) {
    return {
      ok: false,
      reason: "not_absolute",
      message: "전체 경로를 알려 주세요(예: /Users/me/photo.jpg).",
    };
  }

  let size: number;
  try {
    const info = await stat(path);
    if (!info.isFile()) {
      return {
        ok: false,
        reason: "not_a_file",
        message: "그 경로는 파일이 아니에요.",
      };
    }
    size = info.size;
  } catch {
    return {
      ok: false,
      reason: "not_found",
      message: "그 경로에서 파일을 찾지 못했어요.",
    };
  }

  if (size > MAX_FILE_BYTES) {
    return {
      ok: false,
      reason: "too_large",
      message: `사진이 너무 커요(최대 ${String(MAX_FILE_BYTES / 1024 / 1024)}MB).`,
    };
  }
  if (size === 0) {
    return { ok: false, reason: "empty", message: "빈 파일이에요." };
  }

  // Read only the header first, so a non-image ends here rather than after the
  // whole file has been streamed.
  let contentType: string | null = null;
  try {
    const fh = await open(path, "r");
    try {
      const head = new Uint8Array(12);
      await fh.read(head, 0, 12, 0);
      contentType = sniff(head);
    } finally {
      await fh.close();
    }
  } catch {
    return {
      ok: false,
      reason: "unreadable",
      message: "파일을 열지 못했어요.",
    };
  }

  if (contentType === null) {
    return {
      ok: false,
      reason: "not_an_image",
      message: "이미지 파일이 아니에요(PNG·JPEG·GIF·WebP만 넣을 수 있어요).",
    };
  }

  return {
    ok: true,
    stream: createReadStream(path),
    contentType,
    byteLength: size,
    fileName: basename(path),
  };
}
