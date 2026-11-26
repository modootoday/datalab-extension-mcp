/** Request and response plumbing shared by the loopback routes. */
import type { IncomingMessage, ServerResponse } from "node:http";

/** Max handshake body. A hello is a few hundred bytes; anything larger is noise. */
export const MAX_BODY_BYTES = 64 * 1024;

/**
 * Max body on the route the extension answers through — sized for what it
 * carries: the whole tool catalog and every tool result.
 *
 * An over-cap reply is rejected whole and its request then waits out the
 * deadline, which reads from outside as a slow tool. The catalog must be
 * measured against this number, never assumed to fit under it.
 */
export const MAX_RESULT_BODY_BYTES = 4 * 1024 * 1024;

/** One export chunk: 1 MiB of bytes as base64, plus the envelope. */
export const MAX_ARTIFACT_BODY_BYTES = 2 * 1024 * 1024;

/** 1, 10, 100, … — one line per order of magnitude instead of one per call. */
export function isFirstOrDecade(n: number): boolean {
  if (n === 1) return true;
  let at = 10;
  while (at < n) at *= 10;
  return at === n;
}

/** node lowercases header names and repeats become an array; take the first. */
export function headerValue(
  raw: string | string[] | undefined,
): string | undefined {
  const one = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = one?.trim();
  return trimmed ? trimmed.slice(0, 128) : undefined;
}

export function correlationValue(value: string, max: number): string {
  return /^[a-zA-Z0-9_-]+$/.test(value) ? value.slice(0, max) : "redacted";
}

/**
 * Write a response, tolerating a caller that hung up first. Writing to a gone
 * socket throws, and that throw belongs to one abandoned request rather than to
 * the daemon serving every other connected app, so it stops here.
 */
export function writeSafely(
  res: ServerResponse,
  status: number,
  headers: Record<string, string>,
  body: string,
): void {
  if (res.writableEnded || res.destroyed) return;
  try {
    res.writeHead(status, headers);
    res.end(body);
  } catch {
    // Nothing to send it to.
  }
}

export function json(res: ServerResponse, status: number, body: unknown): void {
  writeSafely(
    res,
    status,
    { "content-type": "application/json" },
    JSON.stringify(body),
  );
}

/** Read a JSON body, refusing anything oversized before it is buffered. */
export function readJson(
  req: IncomingMessage,
  maxBytes: number,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
    req.on("error", reject);
  });
}
