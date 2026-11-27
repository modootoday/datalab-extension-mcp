import { describe, expect, it, vi } from "vitest";

import {
  endPortListener,
  identityQuery,
  isOwnConnector,
  listenerQuery,
  parseLsofListeners,
  parseNetstatListeners,
  soleListener,
} from "../src/port-listener.js";

const NETSTAT = [
  "",
  "Active Connections",
  "",
  "  Proto  Local Address          Foreign Address        State           PID",
  "  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       1012",
  "  TCP    127.0.0.1:8765         0.0.0.0:0              LISTENING       4321",
  "  TCP    127.0.0.1:8765         127.0.0.1:52011        ESTABLISHED     4321",
  "  TCP    127.0.0.1:52011        127.0.0.1:8765         ESTABLISHED     7777",
  "  TCP    [::1]:8765             [::]:0                 LISTENING       4322",
  "  TCP    0.0.0.0:8765           0.0.0.0:0              LISTENING       4323",
  "  TCP    127.0.0.1:18765        0.0.0.0:0              LISTENING       5555",
].join("\r\n");

const LSOF =
  "p4321\nf21\nn127.0.0.1:8765\np4322\nf21\nn[::1]:8765\np4323\nf9\nn*:8765\n";
const OURS = "1000 node /opt/node/bin/datalab-extension-mcp serve";

describe("parseNetstatListeners", () => {
  it("takes only listeners on exactly 127.0.0.1 and the given port", () => {
    expect(parseNetstatListeners(NETSTAT, 8765)).toEqual([4321]);
  });

  it("ignores clients, other addresses and lookalike ports", () => {
    const pids = parseNetstatListeners(NETSTAT, 8765);
    for (const other of [7777, 4322, 4323, 5555]) {
      expect(pids).not.toContain(other);
    }
  });
});

describe("parseLsofListeners", () => {
  it("takes only the process bound to 127.0.0.1 at the port", () => {
    expect(parseLsofListeners(LSOF, 8765)).toEqual([4321]);
  });

  it("ignores lookalike ports and noise", () => {
    expect(parseLsofListeners("p9\nn127.0.0.1:18765\nxyz\n", 8765)).toEqual([]);
  });
});

describe("listenerQuery", () => {
  it("runs netstat or lsof directly, never a shell or a script host", () => {
    expect(listenerQuery("win32", 8765)).toEqual({
      command: "netstat",
      args: ["-ano", "-p", "TCP"],
    });
    expect(listenerQuery("linux", 8765)).toEqual({
      command: "lsof",
      args: ["-nP", "-iTCP:8765", "-sTCP:LISTEN", "-Fpn"],
    });
    expect(listenerQuery("darwin", 9999)?.args).toContain("-iTCP:9999");
    expect(listenerQuery("aix", 8765)).toBeNull();
  });
});

describe("identityQuery", () => {
  it("reads owner and command with ps, and has nothing on Windows", () => {
    expect(identityQuery("linux", 42)).toEqual({
      command: "ps",
      args: ["-o", "uid=,command=", "-p", "42"],
    });
    expect(identityQuery("win32", 42)).toBeNull();
  });
});

describe("isOwnConnector", () => {
  it("needs this user and our bin", () => {
    expect(isOwnConnector(` ${OURS}\n`, 1000)).toBe(true);
    expect(isOwnConnector(OURS, 0)).toBe(false);
    expect(isOwnConnector("1000 python3 -m http.server", 1000)).toBe(false);
    expect(isOwnConnector("", 1000)).toBe(false);
  });
});

describe("soleListener", () => {
  it("names one listener, never a pick among several", () => {
    expect(soleListener([4321], 1)).toBe(4321);
    expect(soleListener([4321, 1], 1)).toBe(4321);
    expect(soleListener([4321, 4322], 1)).toBeNull();
    expect(soleListener([], 1)).toBeNull();
  });
});

describe("endPortListener", () => {
  const deps = (capture: (c: string) => Promise<string>) => ({
    capture,
    killPid: vi.fn(),
    selfPid: 1,
    uid: 1000,
  });
  const system = async (command: string) => (command === "ps" ? OURS : LSOF);

  it("ends the one listener that is proven ours", async () => {
    const d = deps(system);
    expect(await endPortListener("linux", 8765, 4321, d)).toBe(true);
    expect(d.killPid.mock.calls).toEqual([[4321]]);
  });

  it("ends nothing when the reported pid differs", async () => {
    const d = deps(system);
    expect(await endPortListener("linux", 8765, 4322, d)).toBe(false);
    expect(d.killPid).not.toHaveBeenCalled();
  });

  it("ends nothing without a reported pid or a user id", async () => {
    const d = deps(system);
    expect(await endPortListener("linux", 8765, null, d)).toBe(false);
    expect(
      await endPortListener("linux", 8765, 4321, { ...d, uid: undefined }),
    ).toBe(false);
    expect(d.killPid).not.toHaveBeenCalled();
  });

  it("ends nothing on Windows, where identity cannot be read", async () => {
    const d = deps(async () => NETSTAT);
    expect(await endPortListener("win32", 8765, 4321, d)).toBe(false);
    expect(d.killPid).not.toHaveBeenCalled();
  });

  it("reports nothing ended when the listener is already gone", async () => {
    const d = {
      ...deps(system),
      killPid: () => {
        throw new Error("ESRCH");
      },
    };
    expect(await endPortListener("linux", 8765, 4321, d)).toBe(false);
  });

  it("does nothing on a platform it has no listing for", async () => {
    const capture = vi.fn(async () => "");
    expect(await endPortListener("aix", 8765, 4321, deps(capture))).toBe(false);
    expect(capture).not.toHaveBeenCalled();
  });
});
