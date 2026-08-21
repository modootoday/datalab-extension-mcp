/**
 * Which of the three subcommand handlers a given argv reaches. Routing is
 * separated from the process entry so it can be asserted with injected
 * handlers, spawning no daemon and connecting no transport.
 */
import { describe, expect, it, vi } from "vitest";

import { dispatchCli, type CliHandlers } from "../src/adapter.js";

function spies(): CliHandlers & {
  install: ReturnType<typeof vi.fn>;
  serve: ReturnType<typeof vi.fn>;
  adapter: ReturnType<typeof vi.fn>;
  unknown: ReturnType<typeof vi.fn>;
  skills: ReturnType<typeof vi.fn>;
} {
  return {
    install: vi.fn().mockResolvedValue(undefined),
    serve: vi.fn(),
    unknown: vi.fn(),
    skills: vi.fn().mockResolvedValue(undefined),
    adapter: vi.fn().mockResolvedValue(undefined),
  };
}

const NODE = "/usr/bin/node";
const BIN = "/abs/cli.js";

describe("dispatchCli", () => {
  it("routes `install` to the installer with the remaining args", async () => {
    const h = spies();
    await dispatchCli([NODE, BIN, "install", "--yes"], h);
    expect(h.install).toHaveBeenCalledWith("install", ["--yes"]);
    expect(h.serve).not.toHaveBeenCalled();
    expect(h.adapter).not.toHaveBeenCalled();
  });

  it("routes `uninstall` to the installer", async () => {
    const h = spies();
    await dispatchCli([NODE, BIN, "uninstall"], h);
    expect(h.install).toHaveBeenCalledWith("uninstall", []);
  });

  it("routes `serve` to the daemon runner", async () => {
    const h = spies();
    await dispatchCli([NODE, BIN, "serve"], h);
    expect(h.serve).toHaveBeenCalledOnce();
    expect(h.install).not.toHaveBeenCalled();
    expect(h.adapter).not.toHaveBeenCalled();
  });

  it("routes no subcommand to the adapter (the host-spawned default)", async () => {
    const h = spies();
    await dispatchCli([NODE, BIN], h);
    expect(h.adapter).toHaveBeenCalledOnce();
  });

  it("routes `skills` and passes the rest along", async () => {
    const h = spies();
    await dispatchCli([NODE, BIN, "skills", "status"], h);
    expect(h.skills).toHaveBeenCalledWith(["status"]);
    expect(h.adapter).not.toHaveBeenCalled();
  });

  // Retired with the registration ledger, and refused rather than left to
  // fall through to the adapter.
  it("`browsers` 는 더 이상 명령이 아니다", async () => {
    const h = spies();
    await dispatchCli([NODE, BIN, "browsers", "list"], h);
    expect(h.unknown).toHaveBeenCalledWith("browsers");
    expect(h.adapter).not.toHaveBeenCalled();
  });

  /**
   * A typo must not be answered by speaking the MCP protocol at a person's
   * terminal. Nothing appears on screen — diagnostics go to stderr — while a
   * connector starts and schedules its own replacement.
   */
  it("모르는 단어는 어댑터가 아니라 거절이다", async () => {
    const h = spies();
    await dispatchCli([NODE, BIN, "browers"], h);
    expect(h.unknown).toHaveBeenCalledWith("browers");
    expect(h.adapter).not.toHaveBeenCalled();
    expect(h.serve).not.toHaveBeenCalled();
  });

  /**
   * Flags are what hosts pass, and only flags. Every config the installer
   * writes is `["-y", "<spec>"]`, so nothing it produces reaches the refusal —
   * refusing a leading dash would take the connector down for every user.
   */
  it("플래그는 그대로 어댑터로 간다", async () => {
    const h = spies();
    await dispatchCli([NODE, BIN, "--no-self-update"], h);
    expect(h.adapter).toHaveBeenCalledOnce();
    expect(h.unknown).not.toHaveBeenCalled();
  });
});
