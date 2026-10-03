/**
 * The host config pins an exact version, so a release reaches a paired user
 * only if the adapter promotes itself. Refusing to serve instead would end
 * whatever that user was doing; re-execing keeps the session.
 */
import { describe, it, expect, vi } from "vitest";
import {
  canonicalVersion,
  countRequests,
  selfUpdateAndRestart,
} from "../src/adapter.js";

const okFetch = (version: unknown) =>
  vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ version }),
  }) as unknown as typeof fetch;

describe("canonicalVersion", () => {
  it("reads the gateway's pin", async () => {
    await expect(canonicalVersion(okFetch("1.5.0"))).resolves.toBe("1.5.0");
  });

  it("refuses anything that is not a plain semver", async () => {
    // This string is about to be spawned as an npm spec.
    for (const bad of ["latest", "1.5", "1.5.0 && rm -rf /", 42, null]) {
      await expect(canonicalVersion(okFetch(bad))).resolves.toBeNull();
    }
  });

  it("a failed lookup changes nothing", async () => {
    const boom = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(
      canonicalVersion(boom as unknown as typeof fetch),
    ).resolves.toBeNull();
  });
});

describe("selfUpdateAndRestart", () => {
  const log = () => {};

  it("re-execs the canonical build with the SAME argv", async () => {
    const spawn = vi.fn().mockReturnValue({ status: 0 });
    const exit = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);

    await selfUpdateAndRestart("1.4.3", log, {
      resolve: async () => "1.5.0",
      spawn: spawn as never,
      argv: ["--token", "abc"],
    });

    const [cmd, args] = spawn.mock.calls[0] as [string, string[]];
    expect(cmd).toBe("npx");
    expect(args).toEqual([
      "-y",
      "@modootoday/datalab-extension-mcp@1.5.0",
      "--token",
      "abc",
    ]);
    expect(exit).toHaveBeenCalled();
    exit.mockRestore();
  });

  it("does nothing when this build is already canonical", async () => {
    const spawn = vi.fn();
    await expect(
      selfUpdateAndRestart("1.5.0", log, {
        resolve: async () => "1.5.0",
        spawn: spawn as never,
      }),
    ).resolves.toBe(false);
    expect(spawn).not.toHaveBeenCalled();
  });

  it("never downgrades", async () => {
    const spawn = vi.fn();
    await selfUpdateAndRestart("1.5.0", log, {
      resolve: async () => "1.4.3",
      spawn: spawn as never,
    });
    expect(spawn).not.toHaveBeenCalled();
  });

  it("keeps serving when the newer build cannot start", async () => {
    // An outdated connector beats a connector that failed to launch.
    const spawn = vi.fn().mockReturnValue({ error: new Error("npx missing") });
    await expect(
      selfUpdateAndRestart("1.4.3", log, {
        resolve: async () => "1.5.0",
        spawn: spawn as never,
      }),
    ).resolves.toBe(false);
  });

  it("stays put when the gateway has no answer", async () => {
    const spawn = vi.fn();
    await selfUpdateAndRestart("1.4.3", log, {
      resolve: async () => null,
      spawn: spawn as never,
    });
    expect(spawn).not.toHaveBeenCalled();
  });
});

describe("in-session promotion", () => {
  it("swaps mid-session, not only at start-up", async () => {
    // A release lands while the host sits idle with the app open. Nothing else
    // would ever restart that connector, so the superseded build would serve
    // for as long as the user leaves the app running.
    const { runAdapter } = await import("../src/adapter.js");
    const spawn = vi.fn().mockReturnValue({ status: 0 });
    const exit = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
    const transport = {
      start: async () => {},
      send: async () => {},
      close: async () => {},
      onclose: undefined as (() => void) | undefined,
    };

    await runAdapter({
      version: "1.4.3",
      ensure: async () => {},
      transport: transport as never,
      subscribe: async () => {},
      watchIntervalMs: 5,
      log: () => {},
      canonical: async () => "9.9.9",
      spawnImpl: spawn as never,
    } as never);

    await new Promise((r) => setTimeout(r, 40));
    expect(spawn).toHaveBeenCalled();
    transport.onclose?.();
    exit.mockRestore();
  });
});

describe("countRequests", () => {
  it("counts what is in flight, so a swap waits for a quiet moment", () => {
    // Re-execing under a running call drops it; the host just sees a hang.
    const flight = { count: 0 };
    const seen: number[] = [];
    const mark = countRequests(flight, (d) => seen.push(d));

    mark(1);
    mark(1);
    expect(flight.count).toBe(2);
    mark(-1);
    mark(-1);
    expect(flight.count).toBe(0);
    // The caller's own hook still sees every edge.
    expect(seen).toEqual([1, 1, -1, -1]);
  });

  it("works without a passthrough", () => {
    const flight = { count: 0 };
    countRequests(flight)(1);
    expect(flight.count).toBe(1);
  });
});
