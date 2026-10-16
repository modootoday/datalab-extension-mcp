/**
 * Files an editor export hands back to the MCP host (ADR-EDX-003).
 *
 * The panel sends an artifact in base64 chunks, each appended at the offset it
 * declares; the final chunk is checked against the declared size and sha256
 * before the file is renamed into place. The caller never chooses the folder.
 */
import { createHash, randomUUID } from "node:crypto";
import { appendFile, mkdir, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";

/** Large enough for a 30-minute 1080p export; a hard stop for anything else. */
export const MAX_ARTIFACT_BYTES = 1024 * 1024 * 1024;
const OPEN_TTL_MS = 30 * 60 * 1000;

export interface ArtifactChunk {
  key: string;
  name: string;
  offset: number;
  data: string;
  final: boolean;
  bytes?: number;
  sha256?: string;
}

export type ChunkResult =
  | { ok: true; state: "open"; received: number }
  | { ok: true; state: "saved"; path: string; bytes: number; sha256: string }
  | { ok: false; reason: string; message: string };

export interface ArtifactStore {
  write: (chunk: ArtifactChunk) => Promise<ChunkResult>;
}

interface Open {
  partPath: string;
  finalPath: string;
  received: number;
  hash: ReturnType<typeof createHash>;
  openedAt: number;
}

const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

/** Keep a readable, filesystem-safe name; the folder is always ours. */
export function safeArtifactName(name: string): string {
  const printable = [...name].filter((c) => c.charCodeAt(0) >= 0x20).join("");
  const cleaned = printable
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 120);
  return cleaned || "export.bin";
}

function day(now: number): string {
  return new Date(now).toISOString().slice(0, 10).replace(/-/g, "");
}

function refuse(reason: string, message: string): ChunkResult {
  return { ok: false, reason, message };
}

export function createArtifactStore(opts: {
  root: string;
  now?: () => number;
}): ArtifactStore {
  const now = opts.now ?? Date.now;
  const open = new Map<string, Open>();

  async function drop(key: string, entry: Open): Promise<void> {
    open.delete(key);
    await rm(entry.partPath, { force: true });
  }

  async function expire(): Promise<void> {
    const t = now();
    for (const [key, entry] of open) {
      if (t - entry.openedAt > OPEN_TTL_MS) await drop(key, entry);
    }
  }

  async function write(chunk: ArtifactChunk): Promise<ChunkResult> {
    await expire();
    if (!BASE64.test(chunk.data)) {
      return refuse("bad_chunk", "내보낸 파일 조각을 읽지 못했어요.");
    }
    let entry = open.get(chunk.key);
    if (!entry) {
      if (chunk.offset !== 0) {
        return refuse("bad_offset", "내보낸 파일을 처음부터 다시 보내 주세요.");
      }
      const dir = join(opts.root, day(now()));
      await mkdir(dir, { recursive: true });
      const finalPath = join(
        dir,
        `${randomUUID().slice(0, 8)}-${safeArtifactName(chunk.name)}`,
      );
      entry = {
        partPath: `${finalPath}.part`,
        finalPath,
        received: 0,
        hash: createHash("sha256"),
        openedAt: now(),
      };
      open.set(chunk.key, entry);
    }
    if (chunk.offset !== entry.received) {
      await drop(chunk.key, entry);
      return refuse("bad_offset", "내보낸 파일 조각의 순서가 맞지 않아요.");
    }
    const bytes = Buffer.from(chunk.data, "base64");
    if (entry.received + bytes.length > MAX_ARTIFACT_BYTES) {
      await drop(chunk.key, entry);
      return refuse("too_large", "내보낸 파일이 너무 커요(최대 1GB).");
    }
    await appendFile(entry.partPath, bytes);
    entry.hash.update(bytes);
    entry.received += bytes.length;
    if (!chunk.final) {
      return { ok: true, state: "open", received: entry.received };
    }
    const sha256 = entry.hash.digest("hex");
    if (
      (chunk.bytes !== undefined && chunk.bytes !== entry.received) ||
      (chunk.sha256 !== undefined && chunk.sha256 !== sha256)
    ) {
      await drop(chunk.key, entry);
      return refuse(
        "mismatch",
        "받은 파일이 내보낸 파일과 달라요. 다시 시도해 주세요.",
      );
    }
    if (entry.received === 0) await appendFile(entry.partPath, Buffer.alloc(0));
    await rename(entry.partPath, entry.finalPath);
    open.delete(chunk.key);
    const size = (await stat(entry.finalPath)).size;
    return {
      ok: true,
      state: "saved",
      path: entry.finalPath,
      bytes: size,
      sha256,
    };
  }

  return { write };
}
