/**
 * Production wiring for the I/O seam — the only module here that touches the
 * real filesystem, process table, and terminal. Everything else is pure against
 * the interface, which is what makes the fixture matrix possible.
 */
import { spawn as nodeSpawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { createInterface } from "node:readline";

import type { Io, SpawnResult } from "./types.js";

export function createNodeIo(): Io {
  return {
    platform: process.platform,
    fetch: globalThis.fetch,
    homedir() {
      return homedir();
    },
    env: process.env,
    async readFile(path) {
      return fs.readFile(path, "utf8");
    },
    async writeFile(path, content) {
      await fs.writeFile(path, content, "utf8");
    },
    async rename(from, to) {
      await fs.rename(from, to);
    },
    async mkdir(path) {
      await fs.mkdir(path, { recursive: true });
    },
    async exists(path) {
      try {
        await fs.access(path);
        return true;
      } catch {
        return false;
      }
    },
    async unlink(path) {
      await fs.unlink(path);
    },
    async rmdir(path) {
      await fs.rmdir(path);
    },
    async listDir(dir) {
      try {
        return await fs.readdir(dir);
      } catch {
        // A missing directory means no backups — not an error worth surfacing.
        return [];
      }
    },
    async spawn(command, args, opts) {
      return new Promise<SpawnResult>((resolve) => {
        // The shell path, used on Windows where these binaries are shims,
        // joins the command line itself because a deprecation warning about
        // args-with-shell reads as a failure on a user's terminal. The join is
        // safe only because every value passed the strict validation patterns.
        const useShell = opts.shell === true;
        const spawnCommand = useShell ? [command, ...args].join(" ") : command;
        const spawnArgs = useShell ? [] : args;
        // Output is discarded by default: detection needs only the exit code,
        // and a vendor CLI's own output would interleave with ours. Inheriting
        // is opt-in, for a long install where a silent terminal reads as a hang.
        const child = nodeSpawn(spawnCommand, spawnArgs, {
          shell: opts.shell,
          stdio: opts.inheritStdio
            ? ["inherit", "inherit", "inherit"]
            : ["ignore", "ignore", "ignore"],
        });
        child.on("error", () => {
          // Binary not found is an expected detection outcome, never a throw.
          resolve({ code: -1 });
        });
        child.on("close", (code) => {
          if (code === null) {
            resolve({ code: -1 });
          } else {
            resolve({ code });
          }
        });
      });
    },
    async ask(question) {
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      try {
        return await new Promise<string>((resolve) => {
          // Spelled out, not "(Y/n)": the person this asks may be in a
          // terminal for the first time, and that convention stopped one
          // reader cold — they did not know whether the case mattered.
          // `answeredNo` still accepts n / no, so nothing about the contract
          // changes; only what the question looks like.
          rl.question(`${question} (엔터 = 예 / n = 아니오) `, resolve);
        });
      } finally {
        rl.close();
      }
    },
    async prompt(question) {
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      try {
        const answer = await new Promise<string>((resolve) => {
          rl.question(`${question} `, resolve);
        });
        return answer.trim();
      } finally {
        rl.close();
      }
    },
    isInteractive() {
      // The flag is undefined rather than false when stdin is piped, so a
      // boolean coercion is exactly right here.
      return Boolean(process.stdin.isTTY);
    },
    out(line) {
      process.stdout.write(`${line}\n`);
    },
    now() {
      return new Date();
    },
  };
}
