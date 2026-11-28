#!/usr/bin/env node
/**
 * Runs after the build: lists the npm packages inlined into dist, checks each
 * against third-party.json and writes their license texts to
 * dist/THIRD_PARTY_NOTICES. A package, version or license the list does not
 * name fails the build. Usage: node third-party-notices.mjs [package dir]
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MODULES = "node_modules/";
const LICENSE_FILE = /^licen[cs]e(\.(md|txt|markdown))?$/iu;
export const METAFILE = "metafile-esm.json";
export const NOTICES = "THIRD_PARTY_NOTICES";

/**
 * @param {{ inputs: Record<string, unknown> }} metafile
 * @param {string} cwd the directory the bundler ran in
 * @returns {{ roots: Map<string, string>, problems: string[] }}
 */
export function bundledRoots(metafile, cwd) {
  const roots = new Map();
  const problems = [];
  for (const input of Object.keys(metafile.inputs)) {
    const at = input.lastIndexOf(MODULES);
    if (at === -1) continue;
    const parts = input.slice(at + MODULES.length).split("/");
    const first = parts[0] ?? "";
    const name = first.startsWith("@") ? `${first}/${parts[1] ?? ""}` : first;
    const root = resolve(
      cwd,
      input.slice(0, at + MODULES.length + name.length),
    );
    const seen = roots.get(name);
    if (seen !== undefined && seen !== root) {
      problems.push(`${name} is bundled from two copies: ${seen} and ${root}`);
      continue;
    }
    roots.set(name, root);
  }
  return { roots, problems };
}

/**
 * @typedef {{ version: string, via: string, licenseException?: { license: string, reason: string } }} Entry
 * @typedef {{ licenses: string[], own: string[], bundled: Record<string, Entry> }} List
 * @typedef {{ name: string, version: string, license: string, via: string, text: string }} Notice
 * @param {Map<string, string>} roots
 * @param {List} list
 * @param {{ file(path: string): string, dir(path: string): string[] }} read
 * @returns {{ notices: Notice[], problems: string[] }}
 */
export function checkBundled(roots, list, read) {
  const notices = [];
  const problems = [];
  const names = [...roots.keys()].filter((name) => !list.own.includes(name));
  for (const name of names.sort()) {
    const root = roots.get(name) ?? "";
    const entry = list.bundled[name];
    if (entry === undefined) {
      problems.push(`${name} is bundled but third-party.json does not list it`);
      continue;
    }
    const pkg = JSON.parse(read.file(join(root, "package.json")));
    if (pkg.version !== entry.version) {
      problems.push(
        `${name} is ${String(pkg.version)} but third-party.json pins ${entry.version}`,
      );
    }
    const license = pkg.license;
    const allowed =
      typeof license === "string" && list.licenses.includes(license);
    const excepted =
      entry.licenseException !== undefined &&
      entry.licenseException.license === license &&
      entry.licenseException.reason.trim().length > 0;
    if (!allowed && !excepted) {
      problems.push(
        `${name} declares license ${JSON.stringify(license)}, which is not one of ${list.licenses.join(", ")}`,
      );
    }
    const file = read
      .dir(root)
      .find((entryName) => LICENSE_FILE.test(entryName));
    if (file === undefined) {
      problems.push(`${name} ships no license file`);
      continue;
    }
    notices.push({
      name,
      version: String(pkg.version),
      license: String(license),
      via: entry.via,
      text: read.file(join(root, file)).trim(),
    });
  }
  for (const name of Object.keys(list.bundled)) {
    if (!roots.has(name)) {
      problems.push(`${name} is listed in third-party.json but not bundled`);
    }
  }
  return { notices, problems };
}

/** @param {Notice[]} notices */
export function renderNotices(notices) {
  const head =
    "This package inlines the following npm packages into its dist files.\n" +
    "Each is listed with its version, its license, why it is here and its\n" +
    "license text as published in that package.\n";
  const blocks = notices.map(
    (n) =>
      `${"-".repeat(72)}\n${n.name}@${n.version} (${n.license}), bundled via ${n.via}\n\n${n.text}\n`,
  );
  return [head, ...blocks].join("\n");
}

function main() {
  const dir = resolve(process.argv[2] ?? ".");
  const metaPath = join(dir, "dist", METAFILE);
  if (!existsSync(metaPath)) {
    console.error(
      `third-party-notices: ${metaPath} is missing; build with metafile on`,
    );
    process.exit(1);
  }
  const metafile = JSON.parse(readFileSync(metaPath, "utf8"));
  const list = JSON.parse(readFileSync(join(dir, "third-party.json"), "utf8"));
  const { roots, problems: copies } = bundledRoots(metafile, dir);
  const { notices, problems } = checkBundled(roots, list, {
    file: (path) => readFileSync(path, "utf8"),
    dir: (path) => readdirSync(path),
  });
  rmSync(metaPath);
  const all = [...copies, ...problems];
  if (all.length > 0) {
    for (const line of all) console.error(`third-party-notices: ${line}`);
    process.exit(1);
  }
  writeFileSync(join(dir, "dist", NOTICES), renderNotices(notices));
  console.log(
    `third-party-notices: ${String(notices.length)} packages in dist/${NOTICES}`,
  );
}

if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
