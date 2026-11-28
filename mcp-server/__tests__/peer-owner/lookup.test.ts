import { spawn } from "node:child_process";
import { createServer, type Server } from "node:net";
import type { AddressInfo, Socket } from "node:net";
import { afterEach, describe, expect, it } from "vitest";

import {
  WINDOWS_ACCOUNT_TTL_MS,
  createPeerOwnerCheck,
  type PeerOwnerDeps,
} from "../../src/peer-owner/index.js";

const fakeSocket = (): Socket =>
  ({
    remoteAddress: "127.0.0.1",
    remotePort: 52344,
    localAddress: "127.0.0.1",
    localPort: 8765,
  }) as Socket;

const PEER_ROW = (uid: number): string =>
  `   2: 0100007F:CC78 0100007F:223D 01 00000000:00000000 00:00000000 00000000 ${String(uid)} 0 13 1`;

function linuxDeps(
  table: string | null,
  reads: { count: number },
): PeerOwnerDeps {
  return {
    platform: "linux",
    selfPid: 400,
    selfUid: 1000,
    readFile: (path) => {
      reads.count += 1;
      if (table === null || path.endsWith("tcp6"))
        return Promise.reject(new Error("ENOENT"));
      return Promise.resolve(table);
    },
    run: () => Promise.reject(new Error("no command on linux")),
  };
}

describe("peer owner verdict", () => {
  it("admits a peer of this account", async () => {
    const check = createPeerOwnerCheck(linuxDeps(PEER_ROW(1000), { count: 0 }));
    expect(await check(fakeSocket())).toEqual({ kind: "own" });
  });

  it("refuses a peer of another account", async () => {
    const check = createPeerOwnerCheck(linuxDeps(PEER_ROW(1001), { count: 0 }));
    expect(await check(fakeSocket())).toEqual({ kind: "other" });
  });

  it("calls an owner it cannot find unknown", async () => {
    const check = createPeerOwnerCheck(linuxDeps(null, { count: 0 }));
    expect((await check(fakeSocket())).kind).toBe("unknown");
  });

  it("calls a peer whose row is gone unknown", async () => {
    const check = createPeerOwnerCheck(linuxDeps("", { count: 0 }));
    expect((await check(fakeSocket())).kind).toBe("unknown");
  });

  it("looks a socket up once however many requests it carries", async () => {
    const reads = { count: 0 };
    const check = createPeerOwnerCheck(linuxDeps(PEER_ROW(1000), reads));
    const socket = fakeSocket();
    await check(socket);
    await check(socket);
    await check(socket);
    expect(reads.count).toBe(2);
  });

  it("refuses a Windows peer whose account reads N/A", async () => {
    const netstat =
      "  TCP    127.0.0.1:52344        127.0.0.1:8765         ESTABLISHED     500\r\n";
    const deps: PeerOwnerDeps = {
      platform: "win32",
      selfPid: 400,
      selfUid: null,
      readFile: () => Promise.reject(new Error("no proc")),
      run: (command, args) => {
        if (command === "netstat")
          return Promise.resolve({ code: 0, stdout: netstat });
        const pid = args[args.length - 1] === "PID eq 400" ? 400 : 500;
        const account = pid === 400 ? "DESKTOP-1\\alice" : "N/A";
        return Promise.resolve({
          code: 0,
          stdout: `"node.exe","${String(pid)}","Console","1","1 K","Running","${account}","0:00:01","N/A"`,
        });
      },
    };
    expect((await createPeerOwnerCheck(deps)(fakeSocket())).kind).toBe(
      "unknown",
    );
  });

  const windowsDeps = (
    peerUser: () => string,
    asked: number[],
    clock: () => number,
  ): PeerOwnerDeps => ({
    platform: "win32",
    selfPid: 400,
    selfUid: null,
    readFile: () => Promise.reject(new Error("no proc")),
    now: clock,
    run: (command, args) => {
      if (command === "netstat")
        return Promise.resolve({
          code: 0,
          stdout:
            "  TCP    127.0.0.1:52344        127.0.0.1:8765         ESTABLISHED     500\r\n",
        });
      const pid = args[args.length - 1] === "PID eq 400" ? 400 : 500;
      asked.push(pid);
      const user = pid === 400 ? "alice" : peerUser();
      return Promise.resolve({
        code: 0,
        stdout: `"node.exe","${String(pid)}","Console","1","1 K","Running","DESKTOP-1\\${user}","0:00:01","N/A"`,
      });
    },
  });

  it("keeps a refused Windows peer's account for a short while", async () => {
    const asked: number[] = [];
    let clock = 0;
    const check = createPeerOwnerCheck(
      windowsDeps(
        () => "bob",
        asked,
        () => clock,
      ),
    );
    expect((await check(fakeSocket())).kind).toBe("other");
    expect((await check(fakeSocket())).kind).toBe("other");
    expect(asked.filter((pid) => pid === 500)).toHaveLength(1);
    clock = WINDOWS_ACCOUNT_TTL_MS;
    await check(fakeSocket());
    expect(asked.filter((pid) => pid === 500)).toHaveLength(2);
  });

  it("asks again for a Windows pid that answered as our own account, so a recycled pid is never let in", async () => {
    const asked: number[] = [];
    let user = "alice";
    const check = createPeerOwnerCheck(
      windowsDeps(
        () => user,
        asked,
        () => 0,
      ),
    );
    expect((await check(fakeSocket())).kind).toBe("own");
    await new Promise((resolve) => setTimeout(resolve, 0));
    user = "bob";
    expect((await check(fakeSocket())).kind).toBe("other");
    expect(asked.filter((pid) => pid === 500)).toHaveLength(2);
  });

  it("a Windows lookup that throws is not kept and raises no unhandled rejection", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown): void => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", onUnhandled);
    try {
      let calls = 0;
      const base = windowsDeps(
        () => "alice",
        [],
        () => 0,
      );
      const check = createPeerOwnerCheck({
        ...base,
        run: (command, args) => {
          if (
            command === "tasklist" &&
            args[args.length - 1] === "PID eq 500"
          ) {
            calls += 1;
            return Promise.reject(new Error("tasklist failed"));
          }
          return base.run(command, args);
        },
      });
      expect((await check(fakeSocket())).kind).toBe("unknown");
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect((await check(fakeSocket())).kind).toBe("unknown");
      expect(calls).toBe(2);
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });

  it("refuses a macOS peer of another uid, ignoring the daemon's own line", async () => {
    const lsof = [
      "p400",
      "u501",
      "n127.0.0.1:8765->127.0.0.1:52344",
      "p500",
      "u502",
      "n127.0.0.1:52344->127.0.0.1:8765",
    ].join("\n");
    const deps: PeerOwnerDeps = {
      platform: "darwin",
      selfPid: 400,
      selfUid: 501,
      readFile: () => Promise.reject(new Error("no proc")),
      run: () => Promise.resolve({ code: 0, stdout: lsof }),
    };
    expect(await createPeerOwnerCheck(deps)(fakeSocket())).toEqual({
      kind: "other",
    });
  });
});

describe(`on this runner (${process.platform})`, () => {
  let server: Server | null = null;
  afterEach(async () => {
    await new Promise<void>((resolve) =>
      server ? server.close(() => resolve()) : resolve(),
    );
    server = null;
  });

  it("admits a program of this account", async () => {
    const accepted = new Promise<Socket>((resolve) => {
      server = createServer(resolve);
    });
    await new Promise<void>((resolve) =>
      server?.listen(0, "127.0.0.1", resolve),
    );
    const { port } = server?.address() as AddressInfo;
    const peer = spawn(
      process.execPath,
      [
        "-e",
        `require("node:net").connect(${String(port)}, "127.0.0.1"); process.stdin.resume();`,
      ],
      { stdio: ["pipe", "ignore", "ignore"] },
    );
    try {
      const socket = await accepted;
      const started = performance.now();
      const verdict = await createPeerOwnerCheck()(socket);
      const elapsed = performance.now() - started;
      socket.destroy();
      console.log(
        `peer lookup on ${process.platform}: ${elapsed.toFixed(1)} ms`,
      );
      expect(verdict).toEqual({ kind: "own" });
    } finally {
      peer.kill();
    }
  }, 20_000);
});
