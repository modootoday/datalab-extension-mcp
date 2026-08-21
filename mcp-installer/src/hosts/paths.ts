/**
 * Host config path resolution — vendor-agnostic.
 *
 * The platform rules live here alone. A vendor descriptor states WHICH
 * convention it follows; it never restates how that convention resolves.
 */
import type { Io } from "../types.js";

export type PathIo = Pick<Io, "platform" | "homedir" | "env">;

export function joinPath(io: PathIo, ...parts: string[]): string {
  if (io.platform === "win32") {
    return parts.join("\\");
  }
  return parts.join("/");
}

/**
 * Declarative mapping of host config paths.
 *
 * A table rather than per-host assembly: deciding each app's convention by
 * hand means one wrong guess silently breaks one host on one platform.
 *
 * Four conventions cover every host: a dot directory under home, the OS
 * app-data location, XDG that still goes to app data on Windows, and
 * home-relative config that stays under home there — the last two differ on
 * Windows alone, and that difference is the point.
 */
export interface HostPathSpec {
  kind: "home" | "appData" | "xdg" | "homeConfig";
  /** Path segments below the root, filename included. */
  segments: readonly string[];
  /**
   * Segments that differ on Windows.  Some apps differ only in the case of a
   * directory name; inferring a casing rule in code would be wrong for the next
   * host, so a difference is always stated outright.
   */
  win32Segments?: readonly string[];
  /** Valid only on these platforms. Omitted means all of them. */
  platforms?: readonly string[];
}

/** The platform rules live here alone, never restated per host. */
function pathRoot(io: PathIo, kind: HostPathSpec["kind"]): string | null {
  if (kind === "home") {
    return io.homedir();
  }
  // Home-relative even on Windows — deliberately not the app-data location.
  if (kind === "homeConfig") {
    return joinPath(io, io.homedir(), ".config");
  }
  if (io.platform === "win32") {
    const appData = io.env["APPDATA"];
    // Null rather than a guess: writing to the wrong place is a false
    // success.
    return appData === undefined || appData === "" ? null : appData;
  }
  if (kind === "appData" && io.platform === "darwin") {
    return joinPath(io, io.homedir(), "Library", "Application Support");
  }
  const xdg = io.env["XDG_CONFIG_HOME"];
  // XDG is a Linux convention; honouring it on macOS would point at a
  // directory the app never reads.
  if (
    kind === "xdg" &&
    io.platform === "linux" &&
    xdg !== undefined &&
    xdg !== ""
  ) {
    return xdg;
  }
  return joinPath(io, io.homedir(), ".config");
}

export function resolveHostPath(io: PathIo, spec: HostPathSpec): string | null {
  if (spec.platforms !== undefined && !spec.platforms.includes(io.platform)) {
    return null;
  }
  const root = pathRoot(io, spec.kind);
  if (root === null) {
    return null;
  }
  const segments =
    io.platform === "win32" && spec.win32Segments !== undefined
      ? spec.win32Segments
      : spec.segments;
  return joinPath(io, root, ...segments);
}
