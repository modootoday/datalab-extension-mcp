/**
 * The default install and relink paths, against a stand-in installer: what
 * reaches it, and what it is never handed.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const installer = vi.hoisted(() => ({
  createNodeIo: vi.fn(() => ({ out: (_: string) => {} })),
  resolveGlobalLaunch: vi.fn(),
  installGlobally: vi.fn(),
  relinkInstalledHosts: vi.fn(async () => [
    { hostId: "claude", status: "success" },
  ]),
  validateInstallOptions: vi.fn((opts: { token: string }) =>
    opts.token === "" ? "invalid" : null,
  ),
}));

vi.mock("@modootoday/datalab-extension-app-mcp-installer", () => installer);

import { updateInstalledCopy } from "../src/adapter.js";

const launch = { node: "/usr/bin/node", cli: "/g/cli.js" };
const quiet = () => {};

afterEach(() => {
  vi.clearAllMocks();
  delete process.env["DATALAB_MCP_TOKEN"];
  delete process.env["DATALAB_MCP_EXTENSION_ID"];
});

describe("default install", () => {
  it("skips npm when the version is already installed", async () => {
    installer.resolveGlobalLaunch.mockResolvedValue({ ok: true, launch });
    await expect(
      updateInstalledCopy("1.12.0", quiet, {
        launch: "global",
        resolve: async () => "1.13.0",
      }),
    ).resolves.toBe("installed");
    expect(installer.installGlobally).not.toHaveBeenCalled();
  });

  it("installs quietly and reports a failure without throwing", async () => {
    installer.resolveGlobalLaunch.mockResolvedValue({
      ok: false,
      reason: "not-found",
    });
    installer.installGlobally.mockResolvedValue({
      ok: false,
      reason: "install-failed",
    });
    await expect(
      updateInstalledCopy("1.12.0", quiet, {
        launch: "global",
        resolve: async () => "1.13.0",
      }),
    ).resolves.toBe("failed");
    expect(installer.installGlobally).toHaveBeenCalledWith(
      expect.anything(),
      "1.13.0",
      { inheritStdio: false },
    );
  });
});

describe("default relink", () => {
  it("hands the installer the session's credentials and the installed launch", async () => {
    process.env["DATALAB_MCP_TOKEN"] = "a".repeat(32);
    process.env["DATALAB_MCP_EXTENSION_ID"] = "b".repeat(32);
    installer.resolveGlobalLaunch.mockResolvedValue({ ok: true, launch });
    await expect(
      updateInstalledCopy("1.12.0", quiet, {
        launch: "npx",
        resolve: async () => null,
      }),
    ).resolves.toBe("migrated");
    expect(installer.relinkInstalledHosts).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        version: "1.12.0",
        token: "a".repeat(32),
        launch,
      }),
    );
  });

  it("touches no host when the credentials fail the installer's gate", async () => {
    installer.resolveGlobalLaunch.mockResolvedValue({ ok: true, launch });
    await updateInstalledCopy("1.12.0", quiet, {
      launch: "npx",
      resolve: async () => null,
    });
    expect(installer.relinkInstalledHosts).not.toHaveBeenCalled();
  });
});
