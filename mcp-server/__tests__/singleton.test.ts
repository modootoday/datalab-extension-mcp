/**
 * Singleton arbitration — the bind-is-lock logic, tested with neither a real
 * port nor a real process. Every edge (socket connect, child spawn, sleep) is
 * injected, so these assert the arbitration decisions directly: fast-path,
 * spawn-once-then-poll, give-up budget, and the exact spawn shape that keeps a
 * Windows console window from ever appearing.
 */
import { describe, expect, it, vi } from "vitest";
import type { Socket } from "node:net";
import type { ChildProcess } from "node:child_process";

import {
  bindAsLock,
  ensureDaemon,
  spawnDaemon,
  type BindableServer,
} from "../src/singleton.js";

/** A stand-in for a live socket; ensureDaemon only ever passes it through. */
const FAKE_SOCKET = { fake: "socket" } as unknown as Socket;

const noSleep = (): Promise<void> => Promise.resolve();

describe("ensureDaemon", () => {
  it("returns the fast-path socket without spawning when a daemon is already up", async () => {
    const connect = vi.fn().mockResolvedValue(FAKE_SOCKET);
    const spawn = vi.fn();
    const socket = await ensureDaemon({
      host: "127.0.0.1",
      port: 8765,
      daemonEntry: "/abs/daemon.js",
      connect,
      spawn,
      sleep: noSleep,
    });
    expect(socket).toBe(FAKE_SOCKET);
    expect(spawn).not.toHaveBeenCalled();
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("spawns exactly once, then returns the socket once the daemon answers", async () => {
    // First probe finds nothing; after the spawn, the next probe connects.
    const connect = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(FAKE_SOCKET);
    const spawn = vi.fn();
    const socket = await ensureDaemon({
      host: "127.0.0.1",
      port: 8765,
      daemonEntry: "/abs/daemon.js",
      connect,
      spawn,
      sleep: noSleep,
    });
    expect(socket).toBe(FAKE_SOCKET);
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(spawn).toHaveBeenCalledWith("/abs/daemon.js");
  });

  it("throws after the poll budget when no daemon ever comes up", async () => {
    const connect = vi.fn().mockResolvedValue(null);
    const spawn = vi.fn();
    await expect(
      ensureDaemon({
        host: "127.0.0.1",
        port: 8765,
        daemonEntry: "/abs/daemon.js",
        connect,
        spawn,
        sleep: noSleep,
        attempts: 3,
        intervalMs: 1,
      }),
    ).rejects.toThrow(/did not become ready/i);
    // One fast-path probe plus one per poll attempt.
    expect(connect).toHaveBeenCalledTimes(4);
    expect(spawn).toHaveBeenCalledTimes(1);
  });
});

describe("spawnDaemon", () => {
  it("spawns node.exe with the absolute entry, detached and hidden — never npx or a shell", () => {
    const calls: Array<{
      cmd: string;
      args: readonly string[];
      opts: unknown;
    }> = [];
    const unref = vi.fn();
    const fakeSpawn = ((
      cmd: string,
      args: readonly string[],
      opts: unknown,
    ) => {
      calls.push({ cmd, args, opts });
      return { unref } as unknown as ChildProcess;
    }) as unknown as typeof import("node:child_process").spawn;

    spawnDaemon("/abs/path/daemon.js", {
      spawn: fakeSpawn,
      execPath: "/usr/bin/node",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].cmd).toBe("/usr/bin/node");
    // The review-block guarantee: not npx, not a shell.
    expect(calls[0].cmd).not.toBe("npx");
    expect(calls[0].args).toEqual(["/abs/path/daemon.js"]);
    expect(calls[0].opts).toMatchObject({
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    // No `shell` option — a shell is what would pop a console window.
    expect((calls[0].opts as { shell?: unknown }).shell).toBeUndefined();
    expect(unref).toHaveBeenCalledTimes(1);
  });

  it("defaults the command to process.execPath", () => {
    const calls: Array<{ cmd: string }> = [];
    const unref = vi.fn();
    const fakeSpawn = ((cmd: string) => {
      calls.push({ cmd });
      return { unref } as unknown as ChildProcess;
    }) as unknown as typeof import("node:child_process").spawn;

    spawnDaemon("/abs/daemon.js", { spawn: fakeSpawn });
    expect(calls[0].cmd).toBe(process.execPath);
  });
});

describe("bindAsLock", () => {
  /** A minimal server that captures the error handler and the listen call. */
  function fakeServer(): {
    server: BindableServer;
    fireError: (err: NodeJS.ErrnoException) => void;
    listen: ReturnType<typeof vi.fn>;
  } {
    let handler: ((err: NodeJS.ErrnoException) => void) | null = null;
    const listen = vi.fn();
    const server: BindableServer = {
      on: (_event, h) => {
        handler = h;
      },
      listen: (port, host, onListen) => listen(port, host, onListen),
    };
    return {
      server,
      fireError: (err) => {
        if (!handler) throw new Error("no error handler registered");
        handler(err);
      },
      listen,
    };
  }

  it("calls onTaken (not a fault) when the port is already in use", () => {
    const { server, fireError, listen } = fakeServer();
    const onListen = vi.fn();
    const onTaken = vi.fn();
    bindAsLock(server, 8765, "127.0.0.1", onListen, onTaken);
    expect(listen).toHaveBeenCalledWith(8765, "127.0.0.1", onListen);

    const err = Object.assign(new Error("in use"), { code: "EADDRINUSE" });
    fireError(err);
    expect(onTaken).toHaveBeenCalledTimes(1);
  });

  it("rethrows any error that is not EADDRINUSE", () => {
    const { server, fireError } = fakeServer();
    const onTaken = vi.fn();
    bindAsLock(server, 8765, "127.0.0.1", vi.fn(), onTaken);

    const err = Object.assign(new Error("denied"), { code: "EACCES" });
    expect(() => fireError(err)).toThrow(/denied/);
    expect(onTaken).not.toHaveBeenCalled();
  });

  it("passes host and port to listen with no reuseAddr option", () => {
    const { server, listen } = fakeServer();
    bindAsLock(server, 9000, "127.0.0.1", vi.fn(), vi.fn());
    // Exactly three args — the fourth would be an options object we must never
    // pass, since reuseAddr would break the first-wins lock.
    expect(listen.mock.calls[0]).toHaveLength(3);
  });
});
