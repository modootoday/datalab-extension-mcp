/**
 * Argv dispatch — which of the three subcommand handlers a given argv reaches.
 *
 * The routing is extracted from `main()` into `dispatchCli` precisely so it can
 * be asserted with injected handlers, without spawning a daemon or connecting a
 * stdio transport. Node's argv convention is `[execPath, script, ...rest]`, so
 * the subcommand is `argv[2]`.
 */
import { describe, expect, it, vi } from "vitest";

import { dispatchCli, type CliHandlers } from "../src/adapter.js";

function spies(): CliHandlers & {
  install: ReturnType<typeof vi.fn>;
  serve: ReturnType<typeof vi.fn>;
  adapter: ReturnType<typeof vi.fn>;
} {
  return {
    install: vi.fn().mockResolvedValue(undefined),
    serve: vi.fn(),
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

  it("routes an unknown subcommand to the adapter", async () => {
    const h = spies();
    await dispatchCli([NODE, BIN, "wat"], h);
    expect(h.adapter).toHaveBeenCalledOnce();
    expect(h.serve).not.toHaveBeenCalled();
  });
});
