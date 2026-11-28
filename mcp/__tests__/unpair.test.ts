import { describe, expect, it, vi } from "vitest";

import { runUnpair } from "../src/pairing/unpair.js";

describe("unpair", () => {
  it("stops the connector, removes the record and says how to pair again", async () => {
    const lines: string[] = [];
    const deleteRecord = vi.fn().mockReturnValue(true);
    const code = await runUnpair({
      deleteRecord,
      stopDaemon: async () => "stopped",
      print: (line) => lines.push(line),
    });
    expect(code).toBe(0);
    expect(deleteRecord).toHaveBeenCalledOnce();
    expect(lines.join("\n")).toContain("페어링을 해제했어요.");
    expect(lines.join("\n")).toContain("사이드패널을 다시 열면");
    expect(lines.join("\n")).not.toContain("10분");
  });

  it("removes the record when no connector is running", async () => {
    const lines: string[] = [];
    const code = await runUnpair({
      deleteRecord: () => true,
      stopDaemon: async () => "not_running",
      print: (line) => lines.push(line),
    });
    expect(code).toBe(0);
    expect(lines.join("\n")).not.toContain("멈췄어요");
  });

  it("changes nothing and fails when the running connector refuses to stop", async () => {
    const lines: string[] = [];
    const deleteRecord = vi.fn().mockReturnValue(true);
    const code = await runUnpair({
      deleteRecord,
      stopDaemon: async () => "refused",
      print: (line) => lines.push(line),
    });
    expect(code).toBe(1);
    expect(deleteRecord).not.toHaveBeenCalled();
    expect(lines.join("\n")).not.toContain("페어링을 해제했어요.");
  });

  it("says there was nothing to unpair when no record existed", async () => {
    const lines: string[] = [];
    const code = await runUnpair({
      deleteRecord: () => false,
      stopDaemon: async () => "not_running",
      print: (line) => lines.push(line),
    });
    expect(code).toBe(0);
    expect(lines).toEqual(["이 컴퓨터의 커넥터는 페어링된 브라우저가 없어요."]);
  });
});
