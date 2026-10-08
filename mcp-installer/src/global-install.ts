/**
 * Installs the connector as a global npm package and resolves the absolute
 * paths a host runs it by. Every failure returns a reason instead of throwing:
 * the caller keeps the package-runner launch, which is slower but works.
 */
import { packageSpec, SERVER_PACKAGE } from "./hosts/entries.js";
import type { DirectLaunch } from "./hosts/entries.js";
import { joinPath } from "./hosts/paths.js";
import type { Io } from "./types.js";
import { isLaunchPath, VERSION_RE } from "./validate.js";

export type GlobalInstallOutcome =
  | { ok: true; launch: DirectLaunch }
  | {
      ok: false;
      reason: "unsupported" | "install-failed" | "not-found" | "path";
    };

/** Where npm places this package under its global root. */
export function globalPackageDir(io: Io, root: string): string {
  const [scope, name] = SERVER_PACKAGE.split("/") as [string, string];
  return joinPath(io, root, scope, name);
}

/** Resolves the launch of an installed copy at exactly this version, if any. */
export async function resolveGlobalLaunch(
  io: Io,
  version: string,
): Promise<GlobalInstallOutcome> {
  if (io.execPath === undefined || io.npmRootGlobal === undefined) {
    return { ok: false, reason: "unsupported" };
  }
  const root = await io.npmRootGlobal();
  if (root === "") return { ok: false, reason: "not-found" };
  const dir = globalPackageDir(io, root);
  let installed: unknown;
  try {
    installed = JSON.parse(
      await io.readFile(joinPath(io, dir, "package.json")),
    );
  } catch {
    return { ok: false, reason: "not-found" };
  }
  if ((installed as { version?: unknown } | null)?.version !== version) {
    return { ok: false, reason: "not-found" };
  }
  const cli = joinPath(io, dir, "dist", "cli.js");
  if (!(await io.exists(cli))) return { ok: false, reason: "not-found" };
  if (!isLaunchPath(io.execPath) || !isLaunchPath(cli)) {
    return { ok: false, reason: "path" };
  }
  return { ok: true, launch: { node: io.execPath, cli } };
}

/** npm install -g at exactly this version, then resolve its launch. */
export async function installGlobally(
  io: Io,
  version: string,
  opts: { inheritStdio: boolean },
): Promise<GlobalInstallOutcome> {
  if (!VERSION_RE.test(version)) return { ok: false, reason: "install-failed" };
  if (io.execPath === undefined || io.npmRootGlobal === undefined) {
    return { ok: false, reason: "unsupported" };
  }
  let code = -1;
  try {
    const result = await io.spawn(
      "npm",
      ["install", "-g", packageSpec(version)],
      { shell: io.platform === "win32", inheritStdio: opts.inheritStdio },
    );
    code = result.code;
  } catch {
    code = -1;
  }
  if (code !== 0) return { ok: false, reason: "install-failed" };
  return resolveGlobalLaunch(io, version);
}

/** Removes the global copy. A missing copy or a failure is not an error. */
export async function uninstallGlobally(
  io: Io,
  opts: { inheritStdio: boolean },
): Promise<boolean> {
  if (io.npmRootGlobal === undefined) return false;
  const root = await io.npmRootGlobal();
  if (root === "" || !(await io.exists(globalPackageDir(io, root)))) {
    return false;
  }
  try {
    const result = await io.spawn("npm", ["uninstall", "-g", SERVER_PACKAGE], {
      shell: io.platform === "win32",
      inheritStdio: opts.inheritStdio,
    });
    return result.code === 0;
  } catch {
    return false;
  }
}
