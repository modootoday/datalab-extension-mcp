import { describe, expect, it } from "vitest";

import { lsofArgs, lsofPeerRecords } from "../../src/peer-owner/darwin.js";
import { procPeerUids } from "../../src/peer-owner/linux.js";
import {
  netstatPeerPids,
  tasklistAccount,
  tasklistArgs,
} from "../../src/peer-owner/windows.js";

const ENDS = {
  peerAddress: "127.0.0.1",
  peerPort: 52344,
  localAddress: "127.0.0.1",
  localPort: 8765,
};

const PROC_TCP = [
  "  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode",
  "   0: 0100007F:223D 00000000:0000 0A 00000000:00000000 00:00000000 00000000  1000        0 11 1",
  "   1: 0100007F:223D 0100007F:CC78 01 00000000:00000000 00:00000000 00000000  1000        0 12 1",
  "   2: 0100007F:CC78 0100007F:223D 01 00000000:00000000 00:00000000 00000000  1001        0 13 1",
  "   3: 0100007F:CC79 0100007F:223D 06 00000000:00000000 00:00000000 00000000     0        0 0 3",
].join("\n");

const PROC_TCP6_MAPPED = [
  "  sl  local_address                         remote_address                        st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode",
  "   0: 0000000000000000FFFF00000100007F:CC78 0000000000000000FFFF00000100007F:223D 01 00000000:00000000 00:00000000 00000000  1000        0 21 1",
].join("\n");

describe("linux socket tables", () => {
  it("reads the uid of the peer's row, not the daemon's own", () => {
    expect(procPeerUids([PROC_TCP], ENDS)).toEqual([1001]);
  });

  it("finds a dual-stack peer in the IPv6 table as mapped IPv4", () => {
    expect(procPeerUids(["", PROC_TCP6_MAPPED], ENDS)).toEqual([1000]);
  });

  it("ignores rows that are not established", () => {
    expect(procPeerUids([PROC_TCP], { ...ENDS, peerPort: 52345 })).toEqual([]);
  });
});

const LSOF = [
  "p500",
  "u501",
  "f12",
  "n127.0.0.1:52344->127.0.0.1:8765",
  "p400",
  "u501",
  "f20",
  "n127.0.0.1:8765->127.0.0.1:52344",
].join("\n");

describe("macOS lsof", () => {
  it("passes only the peer's port, as one argument", () => {
    expect(lsofArgs(ENDS)).toEqual(["-nP", "-iTCP@127.0.0.1:52344", "-Fpun"]);
  });

  it("keeps the record running from the peer to the daemon and drops the daemon's lines", () => {
    expect(lsofPeerRecords(LSOF, ENDS)).toEqual([{ pid: 500, uid: 501 }]);
  });
});

const NETSTAT = [
  "",
  "Active Connections",
  "",
  "  Proto  Local Address          Foreign Address        State           PID",
  "  TCP    127.0.0.1:8765         0.0.0.0:0              LISTENING       400",
  "  TCP    127.0.0.1:8765         127.0.0.1:52344        ESTABLISHED     400",
  "  TCP    127.0.0.1:52344        127.0.0.1:8765         ESTABLISHED     500",
  "  TCP    127.0.0.1:52340        127.0.0.1:8765         TIME_WAIT       0",
].join("\r\n");

describe("windows netstat and tasklist", () => {
  it("names the process behind the peer's end", () => {
    expect(netstatPeerPids(NETSTAT, ENDS)).toEqual([500]);
  });

  it("asks tasklist for that pid alone", () => {
    expect(tasklistArgs(500)).toEqual([
      "/v",
      "/fo",
      "csv",
      "/nh",
      "/fi",
      "PID eq 500",
    ]);
  });

  it("reads the account column as DOMAIN\\user", () => {
    const row =
      '"node.exe","500","Console","1","45,000 K","Running","DESKTOP-1\\Alice","0:00:01","N/A"';
    expect(tasklistAccount(row, 500)).toBe("desktop-1\\alice");
  });

  it("treats N/A, what another account's process shows, as no account", () => {
    const row =
      '"node.exe","500","Services","0","45,000 K","Unknown","N/A","0:00:01","N/A"';
    expect(tasklistAccount(row, 500)).toBeNull();
  });
});
