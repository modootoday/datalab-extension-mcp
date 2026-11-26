import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  currentAccount,
  ownerOnlyArgs,
  writeOwnerOnly,
} from "../src/owner-file/index.js";

const dirs: string[] = [];

function freshDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "owner-file-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

describe("owner-only state files", () => {
  it.skipIf(process.platform === "win32")("are mode 0600 on POSIX", () => {
    const path = join(freshDir(), "state", "pairing.json");
    writeOwnerOnly(path, "{}\n");
    expect(readFileSync(path, "utf8")).toBe("{}\n");
    expect(statSync(path).mode & 0o777).toBe(0o600);
  });

  it("drop inherited grants and keep the user alone on Windows", () => {
    const calls: string[][] = [];
    const path = join(freshDir(), "pairing.json");
    writeOwnerOnly(path, "{}\n", {
      platform: "win32",
      runIcacls: (args) => {
        calls.push([...args]);
        return true;
      },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.slice(1, 3)).toEqual(["/inheritance:r", "/grant:r"]);
    expect(calls[0]?.[0]).toBe(path);
  });

  it("still write the file when icacls refuses", () => {
    const path = join(freshDir(), "apps.json");
    writeOwnerOnly(path, "[]\n", { platform: "win32", runIcacls: () => false });
    expect(readFileSync(path, "utf8")).toBe("[]\n");
  });

  it("grant only the named account full control", () => {
    expect(ownerOnlyArgs("C:\\x\\pairing.json", "PC\\me")).toEqual([
      "C:\\x\\pairing.json",
      "/inheritance:r",
      "/grant:r",
      "PC\\me:F",
    ]);
  });

  it("name the account with its domain when one is set", () => {
    expect(currentAccount({ USERDOMAIN: "PC" }, "me")).toBe("PC\\me");
    expect(currentAccount({}, "me")).toBe("me");
  });
});
