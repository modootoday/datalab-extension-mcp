import { describe, expect, it, vi } from "vitest";

import {
  endPortListener,
  listenerQuery,
  parseLsofPids,
  parseNetstatListeners,
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
  "  TCP    127.0.0.1:18765        0.0.0.0:0              LISTENING       5555",
].join("\r\n");

describe("parseNetstatListeners", () => {
  it("takes only listeners on exactly the given port", () => {
    expect(parseNetstatListeners(NETSTAT, 8765)).toEqual([4321, 4322]);
  });

  it("ignores clients connected to the port and lookalike ports", () => {
    expect(parseNetstatListeners(NETSTAT, 8765)).not.toContain(7777);
    expect(parseNetstatListeners(NETSTAT, 8765)).not.toContain(5555);
  });
});

describe("parseLsofPids", () => {
  it("reads one id per line and drops noise", () => {
    expect(parseLsofPids("123\n456\n\nabc\n")).toEqual([123, 456]);
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
      args: ["-ti", "tcp:8765", "-sTCP:LISTEN"],
    });
    expect(listenerQuery("darwin", 9999)?.args).toContain("tcp:9999");
    expect(listenerQuery("aix", 8765)).toBeNull();
  });
});

describe("endPortListener", () => {
  it("ends every listener but itself", async () => {
    const killPid = vi.fn();
    const ended = await endPortListener("win32", 8765, {
      capture: async () => NETSTAT,
      killPid,
      selfPid: 4322,
    });
    expect(ended).toBe(true);
    expect(killPid.mock.calls).toEqual([[4321]]);
  });

  it("reports nothing ended when the listener is already gone", async () => {
    const ended = await endPortListener("linux", 8765, {
      capture: async () => "999\n",
      killPid: () => {
        throw new Error("ESRCH");
      },
      selfPid: 1,
    });
    expect(ended).toBe(false);
  });

  it("does nothing on a platform it has no listing for", async () => {
    const capture = vi.fn(async () => "");
    expect(
      await endPortListener("aix", 8765, {
        capture,
        killPid: vi.fn(),
        selfPid: 1,
      }),
    ).toBe(false);
    expect(capture).not.toHaveBeenCalled();
  });
});
