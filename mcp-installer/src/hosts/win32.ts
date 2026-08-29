/**
 * Windows Store container mechanics, shared by the two vendors that ship one.
 */
import type { Io } from "../types.js";
import { joinPath } from "./paths.js";

/**
 * Find a Windows Store install's redirected config directory by enumerating the
 * package container.
 *
 * Only a directory found by prefix scan AND confirmed to exist is returned.
 * Hardcoding the publisher hash would be a guess, and a file placed where the
 * app does not read is a false success. No match falls back to the plain path.
 */
export async function msixRoamingDir(
  io: Io,
  familyPrefix: string,
  appDir: string,
): Promise<string | null> {
  if (io.platform !== "win32") {
    return null;
  }
  const localAppData = io.env["LOCALAPPDATA"];
  if (localAppData === undefined || localAppData === "") {
    return null;
  }
  const packages = joinPath(io, localAppData, "Packages");
  let names: string[];
  try {
    names = await io.listDir(packages);
  } catch {
    return null;
  }
  for (const name of names) {
    if (!name.startsWith(familyPrefix)) {
      continue;
    }
    const dir = joinPath(io, packages, name, "LocalCache", "Roaming", appDir);
    if (await io.exists(dir)) {
      return dir;
    }
  }
  return null;
}

/**
 * Is a Store package installed? Decided by package identity prefix.
 *
 * Never by display name: those are mutable and localised, and a rebranded
 * app can share a display name with a legacy one that does not use this config
 * at all. Package identity does not change.
 */
export async function msixPackageInstalled(
  io: Io,
  familyPrefix: string,
): Promise<boolean> {
  if (io.platform !== "win32") {
    return false;
  }
  const localAppData = io.env["LOCALAPPDATA"];
  if (localAppData === undefined || localAppData === "") {
    return false;
  }
  try {
    const names = await io.listDir(joinPath(io, localAppData, "Packages"));
    return names.some((name) => name.startsWith(familyPrefix));
  } catch {
    return false;
  }
}
