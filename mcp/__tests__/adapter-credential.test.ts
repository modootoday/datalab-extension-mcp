import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  pairingPath,
  takeoverPath,
} from "@modootoday/datalab-extension-app-mcp-server";

import { localRootToken } from "../src/adapter.js";

const PANEL_KEY = "a".repeat(64);
const FIRST_SECRET = "1".repeat(64);
const SECOND_SECRET = "2".repeat(64);
const ENV_TOKEN = "e".repeat(64);

let home: string;

const writeAt = (path: string, body: string): void => {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, body);
};

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "datalab-adapter-cred-"));
  vi.stubEnv("HOME", home);
  vi.stubEnv("USERPROFILE", home);
  vi.stubEnv("DATALAB_MCP_TOKEN", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(home, { recursive: true, force: true });
});

describe("profile-key-scope, the adapter side", () => {
  it.skipIf(process.platform === "win32")(
    "never presents a browser profile's key from the single pairing file",
    () => {
      writeAt(
        pairingPath(home),
        JSON.stringify({ token: PANEL_KEY, pairedAt: "t" }),
      );
      expect(localRootToken()).toBeUndefined();
    },
  );

  it.skipIf(process.platform === "win32")(
    "presents the running daemon's takeover secret, read again on every use",
    () => {
      writeAt(
        pairingPath(home),
        JSON.stringify({ token: PANEL_KEY, pairedAt: "t" }),
      );
      writeAt(takeoverPath(home), `${FIRST_SECRET}\n`);
      expect(localRootToken()).toBe(FIRST_SECRET);
      writeAt(takeoverPath(home), `${SECOND_SECRET}\n`);
      expect(localRootToken()).toBe(SECOND_SECRET);
    },
  );

  it("prefers the environment token", () => {
    vi.stubEnv("DATALAB_MCP_TOKEN", ENV_TOKEN);
    writeAt(takeoverPath(home), `${FIRST_SECRET}\n`);
    expect(localRootToken()).toBe(ENV_TOKEN);
  });
});
