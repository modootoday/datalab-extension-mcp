import { isFirstOrDecade } from "./http-io.js";

const CLIENT_WINDOW_MS = 60_000;
const CLIENT_ID_CAP = 64;

export interface McpObservation {
  noteCredential: (present: boolean) => void;
  noteClient: (id: string | undefined, now: number) => void;
}

/**
 * Counts, never refuses, who calls /mcp.
 *
 * Whether the route can ever require a credential is a question about who is
 * still calling without one, and nothing was measuring that. Logged on the
 * first of each kind and then on powers of ten, so a busy session says it once
 * rather than every call.
 *
 * Two hosts driving one browser are indistinguishable everywhere: they share the
 * pairing credential, this route's token bucket, and the editor lease owner key
 * for outside callers. Whether that is worth fixing is a question about whether
 * two ever run at once, so only a rising high-water mark is logged.
 */
export function createMcpObservation(
  log: ((message: string) => void) | undefined,
): McpObservation {
  let withCredential = 0;
  let withoutCredential = 0;
  const seenClients = new Map<string, number>();
  let mostAtOnce = 0;

  const noteCredential = (present: boolean): void => {
    const n = present ? (withCredential += 1) : (withoutCredential += 1);
    if (!isFirstOrDecade(n)) return;
    log?.(
      present
        ? `/mcp: ${n} call(s) carrying the pairing credential`
        : `/mcp: ${n} call(s) with no pairing credential`,
    );
  };

  const noteClient = (id: string | undefined, now: number): void => {
    if (!id) return;
    seenClients.set(id, now);
    for (const [at, last] of seenClients) {
      if (now - last > CLIENT_WINDOW_MS) seenClients.delete(at);
    }
    // A flood of one-shot ids must not become a leak; the count is what matters.
    while (seenClients.size > CLIENT_ID_CAP) {
      const oldest = seenClients.keys().next().value;
      if (oldest === undefined) break;
      seenClients.delete(oldest);
    }
    if (seenClients.size <= mostAtOnce) return;
    mostAtOnce = seenClients.size;
    if (mostAtOnce < 2) return;
    log?.(
      `/mcp: ${mostAtOnce} adapters called within ${CLIENT_WINDOW_MS / 1000}s — outside callers are not told apart`,
    );
  };

  return { noteCredential, noteClient };
}
