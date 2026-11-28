import { describe, expect, it, vi } from "vitest";

import { createAdapterServer, type FetchImpl } from "../src/adapter.js";
import {
  PORT_HELD_MESSAGE,
  createListenerGuard,
  measureListener,
  procListeners,
  type ListenerMeasure,
  type MeasureDeps,
} from "../src/listener-owner/index.js";

const PORT = 8765;
const HEADER =
  "  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode";

function row(local: string, state: string, uid: number, inode: number): string {
  return `   0: ${local} 00000000:0000 ${state} 00000000:00000000 00:00000000 00000000  ${String(uid)}        0 ${String(inode)} 1 0000000000000000 100 0 0 10 0`;
}

function linux(tcp: string, tcp6 = HEADER): MeasureDeps {
  return {
    platform: "linux",
    uid: 1000,
    readFile: async (path) => (path.endsWith("tcp6") ? tcp6 : tcp),
    run: async () => null,
    portOpen: async () => true,
  };
}

describe("linux socket table", () => {
  it("reads only LISTEN rows on loopback or the wildcard at the port", () => {
    const table = [
      HEADER,
      row("0100007F:223D", "0A", 1000, 11),
      row("0100007F:9C40", "01", 1001, 12),
      row("0100007F:1F90", "0A", 1001, 13),
      row("0101A8C0:223D", "0A", 1001, 14),
    ].join("\n");
    expect(procListeners(table, PORT, false)).toEqual([
      { uid: 1000, inode: "11" },
    ]);
  });

  it("refuses a listener another account owns", async () => {
    const tcp = [HEADER, row("0100007F:223D", "0A", 1001, 21)].join("\n");
    expect(await measureListener(PORT, linux(tcp))).toEqual({ kind: "other" });
  });

  it("refuses another account bound on the IPv6 wildcard", async () => {
    const tcp6 = [
      HEADER,
      row("00000000000000000000000000000000:223D", "0A", 1001, 22),
    ].join("\n");
    expect(await measureListener(PORT, linux(HEADER, tcp6))).toEqual({
      kind: "other",
    });
  });

  it("passes our own listener and names it by its socket", async () => {
    const tcp = [HEADER, row("0100007F:223D", "0A", 1000, 23)].join("\n");
    expect(await measureListener(PORT, linux(tcp))).toEqual({
      kind: "own",
      key: "linux:23",
    });
  });
});

describe("macOS", () => {
  function darwin(
    lsof: string,
    lsofCode: number,
    uid: string,
    open: boolean,
  ): MeasureDeps {
    return {
      platform: "darwin",
      uid: 501,
      readFile: async () => null,
      run: async (command) =>
        command === "lsof"
          ? { code: lsofCode, stdout: lsof }
          : { code: 0, stdout: uid },
      portOpen: async () => open,
    };
  }

  it("refuses a port that answers while lsof finds no listener of ours", async () => {
    expect(await measureListener(PORT, darwin("", 1, "", true))).toEqual({
      kind: "other",
    });
  });

  it("leaves a closed port to the normal restart path", async () => {
    expect(await measureListener(PORT, darwin("", 1, "", false))).toEqual({
      kind: "unknown",
    });
  });

  it("passes our own listener", async () => {
    const out = "p4242\nf12\nn127.0.0.1:8765\n";
    expect(
      await measureListener(PORT, darwin(out, 0, "  501\n", true)),
    ).toEqual({ kind: "own", key: "darwin:4242" });
  });
});

describe("Windows", () => {
  it("proceeds as before", async () => {
    const run = vi.fn();
    const verdict = await measureListener(PORT, {
      platform: "win32",
      uid: undefined,
      readFile: async () => null,
      run,
      portOpen: async () => true,
    });
    expect(verdict).toEqual({ kind: "unknown" });
    expect(run).not.toHaveBeenCalled();
  });
});

describe("the guard", () => {
  it("measures once for several calls while the daemon is the same", async () => {
    const measure = vi.fn(async (): Promise<ListenerMeasure> => ({
      kind: "own",
      key: "linux:1",
    }));
    const guard = createListenerGuard(measure);
    guard.streamOpened();
    await guard.verify();
    await guard.verify();
    await guard.verify();
    expect(measure).toHaveBeenCalledTimes(1);
  });

  it("measures every call while no notification stream is open", async () => {
    const measure = vi.fn(async (): Promise<ListenerMeasure> => ({
      kind: "own",
      key: "linux:1",
    }));
    const guard = createListenerGuard(measure);
    await guard.verify();
    await guard.verify();
    expect(measure).toHaveBeenCalledTimes(2);
  });

  it("measures again once the daemon may have changed", async () => {
    const verdicts: ListenerMeasure[] = [
      { kind: "own", key: "linux:1" },
      { kind: "other" },
    ];
    const guard = createListenerGuard(async () => verdicts.shift()!);
    guard.streamOpened();
    await guard.verify();
    guard.forget();
    await expect(guard.verify()).rejects.toThrow(PORT_HELD_MESSAGE);
  });

  it("does not join a measurement that began before the daemon changed", async () => {
    let finishFirst: (v: ListenerMeasure) => void = () => {};
    const measure = vi
      .fn<() => Promise<ListenerMeasure>>()
      .mockImplementationOnce(
        () => new Promise((resolve) => (finishFirst = resolve)),
      )
      .mockResolvedValueOnce({ kind: "other" });
    const guard = createListenerGuard(measure);
    const early = guard.verify();
    guard.forget();
    guard.streamOpened();
    const late = guard.verify();
    finishFirst({ kind: "own", key: "linux:1" });
    await early;
    await expect(late).rejects.toThrow(PORT_HELD_MESSAGE);
    expect(measure).toHaveBeenCalledTimes(2);
  });
});

describe("the adapter", () => {
  it("sends nothing to a port another account holds and says why", async () => {
    const fetchImpl = vi.fn<FetchImpl>();
    const server = createAdapterServer({
      fetchImpl,
      log: () => {},
      guard: createListenerGuard(async () => ({ kind: "other" })),
    });
    const handler = (
      server as unknown as {
        _requestHandlers: Map<
          string,
          (r: unknown, e: unknown) => Promise<unknown>
        >;
      }
    )._requestHandlers.get("tools/call");
    const out = (await handler!(
      {
        method: "tools/call",
        params: { name: "keyword_trend", arguments: {} },
      },
      {},
    )) as { content: { text: string }[]; isError?: boolean };
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(out.isError).toBe(true);
    expect(out.content[0]?.text).toBe(PORT_HELD_MESSAGE);
  });
});
