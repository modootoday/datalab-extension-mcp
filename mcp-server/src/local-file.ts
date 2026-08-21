/** Reads one bounded regular image through a stable file handle. */
import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
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
 * The extension in the name is chosen by the caller and proves nothing, so
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
  // Relative paths are refused: the daemon's working directory differs per
  // host and is unknown to the user, so nobody could predict which file opens.
  if (!isAbsolute(path)) {
    return {
      ok: false,
      reason: "not_absolute",
      message: "전체 경로를 알려 주세요(예: /Users/me/photo.jpg).",
    };
  }

  let initial: Awaited<ReturnType<typeof lstat>>;
  try {
    initial = await lstat(path);
    if (initial.isSymbolicLink()) {
      return {
        ok: false,
        reason: "not_a_file",
        message: "심볼릭 링크는 사진 파일로 열 수 없어요.",
      };
    }
  } catch {
    return {
      ok: false,
      reason: "not_found",
      message: "그 경로에서 파일을 찾지 못했어요.",
    };
  }

  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    const noFollow = constants.O_NOFOLLOW as number | undefined;
    if (process.platform !== "win32" && typeof noFollow !== "number") {
      return {
        ok: false,
        reason: "unreadable",
        message: "이 환경에서는 파일을 안전하게 열 수 없어요.",
      };
    }
    handle = await open(
      path,
      constants.O_RDONLY | (process.platform === "win32" ? 0 : noFollow!),
    );
    const info = await handle.stat();
    if (initial.dev !== info.dev || initial.ino !== info.ino) {
      await handle.close();
      return {
        ok: false,
        reason: "unreadable",
        message: "파일을 여는 동안 경로가 바뀌었어요.",
      };
    }
    if (!info.isFile()) {
      await handle.close();
      return {
        ok: false,
        reason: "not_a_file",
        message: "그 경로는 파일이 아니에요.",
      };
    }
    if (info.size > MAX_FILE_BYTES) {
      await handle.close();
      return {
        ok: false,
        reason: "too_large",
        message: `사진이 너무 커요(최대 ${String(MAX_FILE_BYTES / 1024 / 1024)}MB).`,
      };
    }
    if (info.size === 0) {
      await handle.close();
      return { ok: false, reason: "empty", message: "빈 파일이에요." };
    }

    const head = new Uint8Array(12);
    await handle.read(head, 0, head.byteLength, 0);
    const contentType = sniff(head);
    if (contentType === null) {
      await handle.close();
      return {
        ok: false,
        reason: "not_an_image",
        message: "이미지 파일이 아니에요(PNG·JPEG·GIF·WebP만 넣을 수 있어요).",
      };
    }

    return {
      ok: true,
      stream: handle.createReadStream({
        autoClose: true,
        start: 0,
        end: info.size - 1,
      }),
      contentType,
      byteLength: info.size,
      fileName: basename(path),
    };
  } catch {
    await handle?.close().catch(() => {});
    return {
      ok: false,
      reason: "unreadable",
      message: "파일을 열지 못했어요.",
    };
  }
}
