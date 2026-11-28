#!/usr/bin/env node
/**
 * Installs a packed tarball into an empty directory and home, then fails if
 * the runtime tree holds any package besides it or the installed bin does not
 * answer tools/list over stdio. Usage: node check-installed-tree.mjs <tarball>
 */
import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ANSWER_MS = 60_000;

/**
 * @param {{ dependencies?: Record<string, { dependencies?: Record<string, unknown> }> }} tree npm ls --all --json
 * @param {string} name the package the tarball holds
 * @returns {string[]} what is wrong with the tree
 */
export function treeProblems(tree, name) {
  const problems = [];
  const top = Object.keys(tree.dependencies ?? {});
  for (const extra of top.filter((dep) => dep !== name)) {
    problems.push(`${extra} is installed beside ${name}`);
  }
  if (!top.includes(name)) problems.push(`${name} is not installed`);
  const own = Object.keys(tree.dependencies?.[name]?.dependencies ?? {});
  for (const dep of own) problems.push(`${name} pulls in ${dep}`);
  return problems;
}

/** @param {unknown} manifest the installed package.json */
export function manifestProblems(manifest) {
  const problems = [];
  const fields = ["dependencies", "optionalDependencies", "peerDependencies"];
  for (const field of fields) {
    const value = /** @type {Record<string, unknown>} */ (manifest)[field];
    if (value !== undefined && Object.keys(value ?? {}).length > 0) {
      problems.push(`the published package.json lists ${field}`);
    }
  }
  return problems;
}

function freePort() {
  return new Promise((done, fail) => {
    const server = createServer();
    server.once("error", fail);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port =
        typeof address === "object" && address !== null ? address.port : 0;
      server.close(() => done(port));
    });
  });
}

function npm(args, cwd, env) {
  const run = spawnSync("npm", args, { cwd, env, encoding: "utf8" });
  return {
    code: run.status ?? 1,
    stdout: run.stdout ?? "",
    stderr: run.stderr ?? "",
  };
}

/** Speaks MCP to the bin and resolves with the tool names tools/list returned. */
function listTools(cli, env) {
  return new Promise((done, fail) => {
    const child = spawn(process.execPath, [cli], {
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let buffer = "";
    const timer = setTimeout(() => {
      child.kill();
      fail(new Error(`no tools/list answer in ${String(ANSWER_MS)} ms`));
    }, ANSWER_MS);
    child.stdout.on("data", (chunk) => {
      buffer += String(chunk);
      for (const line of buffer.split("\n").slice(0, -1)) {
        const message = JSON.parse(line);
        if (message.id === 2) {
          clearTimeout(timer);
          child.kill();
          done((message.result?.tools ?? []).map((tool) => tool.name));
        }
      }
      buffer = buffer.slice(buffer.lastIndexOf("\n") + 1);
    });
    child.on("error", fail);
    const send = (message) => child.stdin.write(`${JSON.stringify(message)}\n`);
    send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "install-check", version: "0" },
      },
    });
    send({ jsonrpc: "2.0", method: "notifications/initialized" });
    send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  });
}

async function main() {
  const tarball = process.argv[2];
  if (tarball === undefined || !existsSync(tarball)) {
    console.error("usage: check-installed-tree.mjs <tarball>");
    process.exit(2);
  }
  const root = mkdtempSync(join(tmpdir(), "install-check-"));
  const home = join(root, "home");
  const project = join(root, "project");
  mkdirSync(home);
  mkdirSync(project);
  writeFileSync(
    join(project, "package.json"),
    '{ "name": "install-check", "private": true }\n',
  );
  const port = await freePort();
  const env = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    DATALAB_MCP_PORT: String(port),
  };
  const problems = [];
  try {
    const install = npm(
      [
        "install",
        "--omit=dev",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        resolve(tarball),
      ],
      project,
      env,
    );
    if (install.code !== 0)
      throw new Error(`npm install failed: ${install.stderr.trim()}`);
    const modules = join(project, "node_modules");
    const scopes = readdirSync(modules).filter(
      (entry) => !entry.startsWith("."),
    );
    const names = scopes.flatMap((entry) =>
      entry.startsWith("@")
        ? readdirSync(join(modules, entry)).map((n) => `${entry}/${n}`)
        : [entry],
    );
    if (names.length !== 1)
      problems.push(`node_modules holds ${names.join(", ")}`);
    const name = names[0] ?? "";
    const pkgDir = join(modules, name);
    const manifest = JSON.parse(
      readFileSync(join(pkgDir, "package.json"), "utf8"),
    );
    problems.push(...manifestProblems(manifest));
    const ls = npm(["ls", "--all", "--omit=dev", "--json"], project, env);
    problems.push(...treeProblems(JSON.parse(ls.stdout || "{}"), name));
    if (!existsSync(join(pkgDir, "dist", "THIRD_PARTY_NOTICES"))) {
      problems.push("dist/THIRD_PARTY_NOTICES is missing");
    }
    const bin = Object.values(manifest.bin ?? {})[0];
    const tools = await listTools(join(pkgDir, String(bin)), env);
    if (tools.length === 0) problems.push("tools/list answered no tools");
    console.log(
      `install-check: ${name}@${String(manifest.version)}, ${String(names.length)} package(s), tools/list ${String(tools.length)} tools`,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  if (problems.length > 0) {
    for (const line of problems) console.error(`install-check: ${line}`);
    process.exit(1);
  }
}

if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
