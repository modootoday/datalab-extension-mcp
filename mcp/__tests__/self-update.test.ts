/**
 * Releases reach a paired user through the global install: a newer canonical
 * build is installed for the next start, and the running session is never
 * swapped. None of this may stand in front of the MCP handshake.
 */
import { describe, it, expect, vi } from "vitest";
import {
  canonicalVersion,
  countRequests,
  launchKindOf,
  updateInstalledCopy,
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
    // This string is about to become an npm spec.
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

describe("launchKindOf", () => {
  it("tells the package runner's cache, the global install and anything else apart", () => {
    expect(
      launchKindOf(
        "C:\\Users\\u\\AppData\\Local\\npm-cache\\_npx\\f85d\\node_modules\\@modootoday\\datalab-extension-mcp\\dist\\cli.js",
      ),
    ).toBe("npx");
    expect(
      launchKindOf(
        "/usr/lib/node_modules/@modootoday/datalab-extension-mcp/dist/cli.js",
      ),
    ).toBe("global");
    expect(launchKindOf("/repo/app/extension-mcp/dist/cli.js")).toBe("other");
    expect(launchKindOf(undefined)).toBe("other");
  });
});

describe("updateInstalledCopy", () => {
  const log = () => {};

  it("installs a newer canonical build for the next start", async () => {
    const install = vi.fn().mockResolvedValue(true);
    const relink = vi.fn();
    await expect(
      updateInstalledCopy("1.12.0", log, {
        launch: "global",
        resolve: async () => "1.13.0",
        install,
        relink,
      }),
    ).resolves.toBe("installed");
    expect(install).toHaveBeenCalledWith("1.13.0");
    expect(relink).not.toHaveBeenCalled();
  });

  it("does nothing when the global install is already canonical", async () => {
    const install = vi.fn();
    await expect(
      updateInstalledCopy("1.13.0", log, {
        launch: "global",
        resolve: async () => "1.13.0",
        install,
      }),
    ).resolves.toBe("none");
    expect(install).not.toHaveBeenCalled();
  });

  it("never downgrades", async () => {
    const install = vi.fn();
    await updateInstalledCopy("1.13.0", log, {
      launch: "global",
      resolve: async () => "1.12.0",
      install,
    });
    expect(install).not.toHaveBeenCalled();
  });

  it("moves a runner-started session's hosts onto the global install", async () => {
    const install = vi.fn().mockResolvedValue(true);
    const relink = vi.fn().mockResolvedValue(undefined);
    await expect(
      updateInstalledCopy("1.12.0", log, {
        launch: "npx",
        resolve: async () => null,
        install,
        relink,
      }),
    ).resolves.toBe("migrated");
    expect(install).toHaveBeenCalledWith("1.12.0");
    expect(relink).toHaveBeenCalledWith("1.12.0");
  });

  it("moves to the newer build when one is canonical", async () => {
    const install = vi.fn().mockResolvedValue(true);
    const relink = vi.fn().mockResolvedValue(undefined);
    await updateInstalledCopy("1.12.0", log, {
      launch: "npx",
      resolve: async () => "1.13.0",
      install,
      relink,
    });
    expect(relink).toHaveBeenCalledWith("1.13.0");
  });

  it("leaves hosts alone when the install fails", async () => {
    const relink = vi.fn();
    await expect(
      updateInstalledCopy("1.12.0", log, {
        launch: "npx",
        resolve: async () => null,
        install: async () => false,
        relink,
      }),
    ).resolves.toBe("failed");
    expect(relink).not.toHaveBeenCalled();
  });

  it("does not touch a build run from anywhere else", async () => {
    const install = vi.fn();
    await expect(
      updateInstalledCopy("1.12.0", log, {
        launch: "other",
        resolve: async () => "9.9.9",
        install,
      }),
    ).resolves.toBe("none");
    expect(install).not.toHaveBeenCalled();
  });
});

describe("runAdapter", () => {
  function transport() {
    return {
      start: async () => {},
      send: async () => {},
      close: async () => {},
      onclose: undefined as (() => void) | undefined,
    };
  }

  it("connects before the update check answers", async () => {
    const { runAdapter } = await import("../src/adapter.js");
    let release: (v: "none") => void = () => {};
    const update = vi.fn(
      () =>
        new Promise<"none">((r) => {
          release = r;
        }),
    );
    const t = transport();
    const start = vi.spyOn(t, "start");

    await runAdapter({
      version: "1.12.0",
      ensure: async () => {},
      transport: t as never,
      subscribe: async () => {},
      log: () => {},
      update,
    } as never);

    // The check is still pending, yet the transport is already up.
    expect(start).toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
    release("none");
    t.onclose?.();
  });

  it("re-checks on an interval and stops once something was installed", async () => {
    const { runAdapter } = await import("../src/adapter.js");
    const update = vi.fn().mockResolvedValue("installed");
    const t = transport();

    await runAdapter({
      version: "1.12.0",
      ensure: async () => {},
      transport: t as never,
      subscribe: async () => {},
      watchIntervalMs: 5,
      log: () => {},
      update,
    } as never);

    await new Promise((r) => setTimeout(r, 40));
    expect(update).toHaveBeenCalledTimes(1);
    t.onclose?.();
  });

  it("--no-self-update pins this build", async () => {
    const { runAdapter } = await import("../src/adapter.js");
    const update = vi.fn().mockResolvedValue("none");
    const t = transport();

    await runAdapter({
      version: "1.12.0",
      ensure: async () => {},
      transport: t as never,
      subscribe: async () => {},
      watchIntervalMs: 5,
      log: () => {},
      selfUpdate: false,
      update,
    } as never);

    await new Promise((r) => setTimeout(r, 20));
    expect(update).not.toHaveBeenCalled();
    t.onclose?.();
  });
});

describe("countRequests", () => {
  it("counts what is in flight, so an update waits for a quiet moment", () => {
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
