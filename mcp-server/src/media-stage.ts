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
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Readable } from "node:stream";

/** Matches what the connector already refuses to read past. */
export const MAX_STAGE_BYTES = 10 * 1024 * 1024;
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
      active.set(held.key, (active.get(held.key) ?? 0) + 1);
      try {
        await mkdir(blobDir, { recursive: true });
        const chunks: Buffer[] = [];
        let total = 0;
        for await (const chunk of body) {
          const buf = Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(chunk as string);
          total += buf.byteLength;
          if (total > MAX_STAGE_BYTES) {
            return { ok: false, reason: "too_large" };
          }
          chunks.push(buf);
        }
        await writeFile(blobPath(held.key), Buffer.concat(chunks));
        return { ok: true, bytes: total };
      } finally {
        const left = (active.get(held.key) ?? 1) - 1;
        if (left <= 0) active.delete(held.key);
        else active.set(held.key, left);
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
            capabilityVersion: STAGE_CAPABILITY,
          };
        }
        return refuse("already_sealed", false, "이미 봉인된 자산이에요.");
      }

      let received: Buffer;
      try {
        received = await readFile(blobPath(key));
      } catch {
        return refuse("upload_expired", false, "받은 바이트가 없어요.");
      }
      const actual = createHash("sha256").update(received).digest("hex");
      if (actual !== req.sha256 || received.byteLength !== req.bytes) {
        // Not sealed, and the ledger is untouched: the caller may send again.
        return refuse(
          "hash_mismatch",
          false,
          "받은 바이트가 알려주신 것과 달라요.",
        );
      }
      const handle = `stage:${key}`;
      await writeRow(key, {
        state: "SEALED",
        fence: req.fence,
        jobId: req.jobId,
        sha256: actual,
        bytes: received.byteLength,
        handle,
        at: now(),
      });
      return {
        state: "SEALED",
        handle,
        bytes: received.byteLength,
        sha256: actual,
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
        bytesReceived = (await readFile(blobPath(key))).byteLength;
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

    async assetCount() {
      try {
        return (await readdir(blobDir)).length;
      } catch {
        return 0;
      }
    },

    async debugWrittenPaths() {
      const out: string[] = [];
      for (const dir of [ledgerDir, blobDir]) {
        try {
          for (const name of await readdir(dir)) out.push(join(dir, name));
        } catch {
          /* not created yet */
        }
      }
      return out;
    },
  };
}
