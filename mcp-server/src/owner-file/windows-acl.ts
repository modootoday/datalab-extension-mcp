/**
 * Narrows a file's Windows ACL to the current user alone. Node's mode bits do
 * not reach Windows, where a new file inherits every grant on its directory.
 */
import { spawnSync } from "node:child_process";
import { userInfo } from "node:os";
import { join } from "node:path";

export type RunIcacls = (args: readonly string[]) => boolean;

/** The account icacls grants, as DOMAIN\user when the domain is known. */
export function currentAccount(
  env: NodeJS.ProcessEnv = process.env,
  username: string = userInfo().username,
): string {
  const domain = env["USERDOMAIN"]?.trim();
  if (!domain) return username;
  return `${domain}\\${username}`;
}

/** Drops inherited grants and leaves full control to the account alone. */
export function ownerOnlyArgs(path: string, account: string): string[] {
  return [path, "/inheritance:r", "/grant:r", `${account}:F`];
}

/** icacls by absolute path, never through a shell. */
export function defaultRunIcacls(args: readonly string[]): boolean {
  const root = process.env["SystemRoot"] ?? "C:\\Windows";
  const result = spawnSync(join(root, "System32", "icacls.exe"), [...args], {
    stdio: "ignore",
    windowsHide: true,
    timeout: 10_000,
  });
  return result.status === 0;
}

export function restrictToOwner(
  path: string,
  run: RunIcacls = defaultRunIcacls,
  account: string = currentAccount(),
): boolean {
  return run(ownerOnlyArgs(path, account));
}
