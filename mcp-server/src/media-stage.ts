/**
 * Receive a binary made elsewhere and seal it.
 *
 * The daemon does not generate anything here. It opens a place, takes bytes
 * over a stream that never touches MCP JSON, verifies them against what the
 * caller declared, and freezes the result. The name says stage and not render
 * because a name that claims generation eventually invites someone to add it.
 *
 * Callers never see a path. They send identifiers; this module decides where
 * the bytes live under its own root. Accepting a caller-supplied root would be
 * arbitrary file write dressed as a parameter.
 */
import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import {
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { Transform, type Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const MIB = 1024 * 1024;

/** The largest upload of any kind; each kind is held to its own cap at commit. */
export const MAX_STAGE_BYTES = 500 * MIB;

export type StageKind = "image" | "video" | "audio" | "cube" | "other";

/** Video and audio go up to 500 MB; anything unrecognised keeps the old 10 MB. */
export const STAGE_KIND_LIMITS: Readonly<Record<StageKind, number>> = {
  image: 10 * MIB,
  video: 500 * MIB,
  audio: 500 * MIB,
  cube: 2 * MIB,
  other: 10 * MIB,
};

const HEAD_BYTES = 16 * 1024;

/** ISO-BMFF brands that are still pictures, not movies. */
const IMAGE_BRANDS = new Set([
  "heic",
  "heix",
  "heim",
  "heis",
  "mif1",
  "msf1",
  "avif",
  "avis",
]);

class TooLarge extends Error {}

function ascii(head: Uint8Array, from: number, to: number): string {
  return String.fromCharCode(...head.subarray(from, to));
}

/** What a file is, from its first bytes. */
export function stageKindOf(head: Uint8Array): StageKind {
  const riff = ascii(head, 0, 4) === "RIFF" ? ascii(head, 8, 12) : "";
  if (riff === "WEBP") return "image";
  if (riff === "WAVE") return "audio";
  if (head[0] === 0x89 && ascii(head, 1, 4) === "PNG") return "image";
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image";
  if (ascii(head, 0, 4) === "GIF8") return "image";
  if (ascii(head, 4, 8) === "ftyp") {
    const brand = ascii(head, 8, 12);
    if (IMAGE_BRANDS.has(brand)) return "image";
    return brand === "M4A " || brand === "M4B " ? "audio" : "video";
  }
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf) return "video";
  if (ascii(head, 0, 4) === "OggS" || ascii(head, 0, 4) === "fLaC") {
    return "audio";
  }
  if (ascii(head, 0, 3) === "ID3") return "audio";
  if (head[0] === 0xff && ((head[1] ?? 0) & 0xe0) === 0xe0) return "audio";
  if (new TextDecoder().decode(head).includes("LUT_3D_SIZE")) return "cube";
  return "other";
}

async function readHead(path: string): Promise<Uint8Array> {
  const file = await open(path, "r");
  try {
    const buf = Buffer.alloc(HEAD_BYTES);
    const { bytesRead } = await file.read(buf, 0, HEAD_BYTES, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await file.close();
  }
}

async function hashFile(
  path: string,
): Promise<{ sha256: string; bytes: number }> {
  const hash = createHash("sha256");
  let bytes = 0;
  for await (const chunk of createReadStream(path)) {
    const buf = chunk as Buffer;
    bytes += buf.byteLength;
    hash.update(buf);
  }
  return { sha256: hash.digest("hex"), bytes };
}

/** The largest range one read may ask for. */
export const MAX_RANGE_BYTES = MIB;

const HANDLE = /^stage:([0-9a-f]{32})$/;
const DEFAULT_TOKEN_TTL_MS = 30 * 60 * 1000;
export const STAGE_CAPABILITY = "datalab-mcp-stage-v1";

export interface JobRef {
  blogId: string;
  runId: string;
  slot: string;
  actionId: string;
  fence: number;
  jobId: string;
}

export type StageState =
  | "OPEN"
  | "SEALED"
  | "CANCELLED"
  | "EXPIRED"
  | "STATE_UNKNOWN";

interface Refusal {
  state: "REFUSED";
  reason: string;
  retryable: boolean;
  message: string;
}

export type BeginResult =
  | {
      state: "OPEN";
      jobId: string;
      uploadToken: string;
      expiresAt: number;
      capabilityVersion: string;
    }
  | Refusal;

export type CommitResult =
  | {
      state: "SEALED";
      handle: string;
      bytes: number;
      sha256: string;
      kind: StageKind;
      capabilityVersion: string;
    }
  | Refusal;

export interface StatusResult {
  state: StageState;
  jobId: string;
  activeUploads: number;
  bytesReceived: number;
  capabilityVersion: string;
}

export type CancelResult =
  | { state: "CANCELLED"; activeUploads: 0; capabilityVersion: string }
  | { state: "STATE_UNKNOWN"; reason: string; retryable: boolean }
  | Refusal;

export interface MediaStage {
  begin(req: JobRef & { declaredBytes: number }): Promise<BeginResult>;
  commit(
    req: JobRef & { sha256: string; bytes: number },
  ): Promise<CommitResult>;
  status(req: JobRef): Promise<StatusResult>;
  cancel(req: JobRef): Promise<CancelResult>;
  receiveUpload(
    token: string,
    body: Readable,
  ): Promise<{ ok: true; bytes: number } | { ok: false; reason: string }>;
  /** Read sealed bytes back — used by the editor path and by tests. */
  readSealed(handle: string): Promise<Buffer>;
  /** Size and kind of a sealed asset, or null when the handle seals nothing. */
  sealedInfo(
    handle: string,
  ): Promise<{ bytes: number; kind: StageKind } | null>;
  /** Up to MAX_RANGE_BYTES of a sealed asset, for a transfer in pieces. */
  readRange(handle: string, offset: number, length: number): Promise<Buffer>;
  assetCount(): Promise<number>;
  debugWrittenPaths(): Promise<string[]>;
}

function refuse(reason: string, retryable: boolean, message: string): Refusal {
  return { state: "REFUSED", reason, retryable, message };
}

/**
 * One segment per identifier, and none of it is the caller's string. Hashing
 * removes every question about traversal, separators and case: `../etc` and a
 * normal id become the same shape, so no input can climb out of the root.
 */
function segment(...parts: string[]): string {
  return createHash("sha256")
    .update(parts.join("\u0000"))
    .digest("hex")
    .slice(0, 32);
}

interface LedgerRow {
  state: Exclude<StageState, "STATE_UNKNOWN">;
  fence: number;
  jobId: string;
  sha256?: string;
  bytes?: number;
  handle?: string;
  kind?: StageKind;
  at: number;
}

export function createMediaStage(opts: {
  root: string;
  tokenTtlMs?: number;
  now?: () => number;
}): MediaStage {
  const now = opts.now ?? Date.now;
  const ttl = opts.tokenTtlMs ?? DEFAULT_TOKEN_TTL_MS;
  const ledgerDir = join(opts.root, "ledger");
  const blobDir = join(opts.root, "blob");

  /** token -> the job it opens, in memory only: a token must not survive us. */
  const tokens = new Map<string, { key: string; expiresAt: number }>();
  /** Uploads still in flight, so cancel can prove there are none. */
  const active = new Map<string, number>();
  /** Digests taken while bytes arrived, so commit need not read them again. */
  const received = new Map<string, { sha256: string; bytes: number }>();
  /** Keys with an upload writing now: one .part per key, one writer at a time. */
  const receiving = new Set<string>();

  // A .part left by a crash belongs to no upload once this daemon starts.
  void readdir(blobDir)
    .then((names) =>
      Promise.all(
        names
          .filter(
            (name) =>
              name.endsWith(".part") && !receiving.has(name.slice(0, -5)),
          )
          .map((name) => rm(join(blobDir, name), { force: true })),
      ),
    )
    .catch(() => undefined);

  const keyOf = (j: JobRef) => segment(j.blogId, j.runId, j.actionId, j.jobId);
  const ledgerPath = (key: string) => join(ledgerDir, `${key}.json`);
  const blobPath = (key: string) => join(blobDir, key);

  async function readRow(
    key: string,
  ): Promise<LedgerRow | null | "unreadable"> {
    try {
      const raw = await readFile(ledgerPath(key), "utf8");
      return JSON.parse(raw) as LedgerRow;
    } catch (err) {
      // Absent and unreadable are different answers. Never opened is a fact;
      // could not be read is not, and reporting the second as the first is how
      // a run decides work is finished that may still be running.
      if ((err as { code?: string }).code === "ENOENT") return null;
      return "unreadable";
    }
  }

  async function writeRow(key: string, row: LedgerRow): Promise<void> {
    await mkdir(ledgerDir, { recursive: true });
    await writeFile(ledgerPath(key), JSON.stringify(row), "utf8");
  }

  return {
    async begin(req) {
      const key = keyOf(req);
      const row = await readRow(key);
      if (row === "unreadable") {
        return refuse("uploads_unproven", true, "작업 상태를 읽지 못했어요.");
      }
      if (row) {
        if (req.fence < row.fence) {
          return refuse(
            "stale_fence",
            false,
            "더 새로운 시도가 이미 진행됐어요.",
          );
        }
        if (row.state === "SEALED") {
          return refuse("already_sealed", false, "이미 봉인된 자산이에요.");
        }
        if (row.state === "OPEN") {
          // Same place, same token: a retry must not open a second slot.
          for (const [token, held] of tokens) {
            if (held.key === key && held.expiresAt > now()) {
              return {
                state: "OPEN",
                jobId: req.jobId,
                uploadToken: token,
                expiresAt: held.expiresAt,
                capabilityVersion: STAGE_CAPABILITY,
              };
            }
          }
        }
      }
      const token = randomUUID();
      const expiresAt = now() + ttl;
      tokens.set(token, { key, expiresAt });
      await writeRow(key, {
        state: "OPEN",
        fence: req.fence,
        jobId: req.jobId,
        at: now(),
      });
      return {
        state: "OPEN",
        jobId: req.jobId,
        uploadToken: token,
        expiresAt,
        capabilityVersion: STAGE_CAPABILITY,
      };
    },

    async receiveUpload(token, body) {
      const held = tokens.get(token);
      if (!held) return { ok: false, reason: "upload_expired" };
      if (held.expiresAt <= now()) {
        tokens.delete(token);
        return { ok: false, reason: "upload_expired" };
      }
      if (receiving.has(held.key)) {
        return { ok: false, reason: "upload_in_progress" };
      }
      receiving.add(held.key);
      active.set(held.key, (active.get(held.key) ?? 0) + 1);
      const part = `${blobPath(held.key)}.part`;
      const hash = createHash("sha256");
      let total = 0;
      let limit = MAX_STAGE_BYTES;
      const head: Buffer[] = [];
      let headBytes = 0;
      // Straight to disk, and each kind held to its own cap while it arrives:
      // a 500 MB video must not sit in the heap, and 500 MB of something else
      // must not be written just to be refused.
      const meter = new Transform({
        transform(chunk: Buffer | string, _enc, done) {
          const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          total += buf.byteLength;
          if (headBytes < HEAD_BYTES) {
            head.push(buf);
            headBytes += buf.byteLength;
            if (headBytes >= HEAD_BYTES) {
              limit = STAGE_KIND_LIMITS[stageKindOf(Buffer.concat(head))];
              head.length = 0;
            }
          }
          if (total > limit) {
            done(new TooLarge());
            return;
          }
          hash.update(buf);
          done(null, buf);
        },
      });
      try {
        await mkdir(blobDir, { recursive: true });
        await pipeline(body, meter, createWriteStream(part));
        await rename(part, blobPath(held.key));
        received.set(held.key, { sha256: hash.digest("hex"), bytes: total });
        return { ok: true, bytes: total };
      } catch (err) {
        await rm(part, { force: true }).catch(() => undefined);
        if (err instanceof TooLarge) return { ok: false, reason: "too_large" };
        return { ok: false, reason: "write_failed" };
      } finally {
        receiving.delete(held.key);
        const left = (active.get(held.key) ?? 1) - 1;
        if (left > 0) active.set(held.key, left);
        if (left <= 0) active.delete(held.key);
      }
    },

    async commit(req) {
      const key = keyOf(req);
      const row = await readRow(key);
      if (row === "unreadable") {
        return refuse("uploads_unproven", true, "작업 상태를 읽지 못했어요.");
      }
      if (!row) return refuse("upload_expired", false, "열린 자리가 없어요.");
      if (req.fence < row.fence) {
        return refuse(
          "stale_fence",
          false,
          "더 새로운 시도가 이미 진행됐어요.",
        );
      }
      if (row.state === "SEALED") {
        // Identical bytes are the same act, so return the same handle. Any
        // other bytes are a second writer, and the seal is what stops it.
        if (row.sha256 === req.sha256 && row.handle) {
          return {
            state: "SEALED",
            handle: row.handle,
            bytes: row.bytes ?? 0,
            sha256: row.sha256,
            kind: row.kind ?? "other",
            capabilityVersion: STAGE_CAPABILITY,
          };
        }
        return refuse("already_sealed", false, "이미 봉인된 자산이에요.");
      }

      let digest: { sha256: string; bytes: number };
      try {
        digest = received.get(key) ?? (await hashFile(blobPath(key)));
      } catch {
        return refuse("upload_expired", false, "받은 바이트가 없어요.");
      }
      const actual = digest.sha256;
      if (actual !== req.sha256 || digest.bytes !== req.bytes) {
        // Not sealed, and the ledger is untouched: the caller may send again.
        return refuse(
          "hash_mismatch",
          false,
          "받은 바이트가 알려주신 것과 달라요.",
        );
      }
      const kind = stageKindOf(await readHead(blobPath(key)));
      if (digest.bytes > STAGE_KIND_LIMITS[kind]) {
        received.delete(key);
        await rm(blobPath(key), { force: true });
        const cap = Math.round(STAGE_KIND_LIMITS[kind] / MIB);
        return refuse(
          "too_large",
          false,
          `이 종류의 파일은 ${cap}MB 까지 올릴 수 있어요.`,
        );
      }
      const handle = `stage:${key}`;
      await writeRow(key, {
        state: "SEALED",
        fence: req.fence,
        jobId: req.jobId,
        sha256: actual,
        bytes: digest.bytes,
        handle,
        kind,
        at: now(),
      });
      received.delete(key);
      return {
        state: "SEALED",
        handle,
        bytes: digest.bytes,
        sha256: actual,
        kind,
        capabilityVersion: STAGE_CAPABILITY,
      };
    },

    async status(req) {
      const key = keyOf(req);
      const row = await readRow(key);
      const base = {
        jobId: req.jobId,
        activeUploads: active.get(key) ?? 0,
        capabilityVersion: STAGE_CAPABILITY,
      };
      if (row === "unreadable") {
        return { ...base, state: "STATE_UNKNOWN", bytesReceived: 0 };
      }
      let bytesReceived = 0;
      try {
        bytesReceived = (await stat(blobPath(key))).size;
      } catch {
        bytesReceived = 0;
      }
      if (!row) return { ...base, state: "STATE_UNKNOWN", bytesReceived };
      return { ...base, state: row.state, bytesReceived };
    },

    async cancel(req) {
      const key = keyOf(req);
      const row = await readRow(key);
      if (row === "unreadable") {
        return {
          state: "STATE_UNKNOWN",
          reason: "uploads_unproven",
          retryable: true,
        };
      }
      if (row?.state === "SEALED") {
        return refuse("already_sealed", false, "이미 봉인된 자산이에요.");
      }
      // Cancelling while bytes are still arriving cannot be reported as
      // done. Saying so anyway is what let a run clean up under a live writer.
      if ((active.get(key) ?? 0) > 0) {
        return {
          state: "STATE_UNKNOWN",
          reason: "uploads_unproven",
          retryable: true,
        };
      }
      await writeRow(key, {
        state: "CANCELLED",
        fence: req.fence,
        jobId: req.jobId,
        at: now(),
      });
      await rm(blobPath(key), { force: true });
      return {
        state: "CANCELLED",
        activeUploads: 0,
        capabilityVersion: STAGE_CAPABILITY,
      };
    },

    async readSealed(handle) {
      return readFile(blobPath(handle.replace(/^stage:/, "")));
    },

    async sealedInfo(handle) {
      const key = HANDLE.exec(handle)?.[1];
      if (!key) return null;
      const row = await readRow(key);
      if (!row || row === "unreadable" || row.state !== "SEALED") return null;
      return { bytes: row.bytes ?? 0, kind: row.kind ?? "other" };
    },

    async readRange(handle, offset, length) {
      const key = HANDLE.exec(handle)?.[1];
      if (!key) throw new Error("not a stage handle");
      const want = Math.max(0, Math.min(length, MAX_RANGE_BYTES));
      const file = await open(blobPath(key), "r");
      try {
        const buf = Buffer.alloc(want);
        const { bytesRead } = await file.read(buf, 0, want, offset);
        return buf.subarray(0, bytesRead);
      } finally {
        await file.close();
      }
    },

    async assetCount() {
      try {
        return (await readdir(blobDir)).filter((n) => !n.endsWith(".part"))
          .length;
      } catch {
        return 0;
      }
    },

    async debugWrittenPaths() {
      const out: string[] = [];
      for (const dir of [ledgerDir, blobDir]) {
        try {
          for (const name of await readdir(dir)) {
            if (!name.endsWith(".part")) out.push(join(dir, name));
          }
        } catch {
          /* not created yet */
        }
      }
      return out;
    },
  };
}
