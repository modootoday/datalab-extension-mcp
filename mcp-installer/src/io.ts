/**
 * Production `Io` wiring — the ONLY module that touches the real filesystem,
 * process table, and terminal. Everything else in this package is pure
 * against the interface, which is what makes the fixture matrix possible.
 */
import { spawn as nodeSpawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { createInterface } from "node:readline";

import type { Io, SpawnResult } from "./types.js";

export function createNodeIo(): Io {
  return {
    platform: process.platform,
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
    async listBackups(dir) {
      try {
        return await fs.readdir(dir);
      } catch {
        // A missing directory means no backups — not an error worth surfacing.
        return [];
      }
    },
    async spawn(command, args, opts) {
      return new Promise<SpawnResult>((resolve) => {
        // The shell path (win32 only — npx/npm/vendor CLIs are `.cmd` shims that
        // need cmd.exe to resolve) builds the command line itself and spawns it
        // as ONE string with no args array. Node 22 deprecates passing an args
        // array WITH shell:true (DEP0190 — "arguments are not escaped, only
        // concatenated"), and printing that warning on a non-technical user's
        // terminal reads as a failure. We take responsibility for the join here:
        // it is safe because every interpolated value already passed the strict
        // validation regexes (hex token, a-p id, dotted version, digit port),
        // so no argument carries a space or a cmd metacharacter to escape.
        const useShell = opts.shell === true;
        const spawnCommand = useShell ? [command, ...args].join(" ") : command;
        const spawnArgs = useShell ? [] : args;
        // Output is discarded by default: detection only needs the exit code,
        // and the vendor CLIs' own stdout would interleave confusingly with
        // ours. `inheritStdio` opts into showing it — used for the long
        // `npm install -g`, where a silent terminal reads as a hang.
        const child = nodeSpawn(spawnCommand, spawnArgs, {
          shell: opts.shell,
          stdio: opts.inheritStdio
            ? ["inherit", "inherit", "inherit"]
            : ["ignore", "ignore", "ignore"],
        });
        child.on("error", () => {
          // Binary not found — an expected detection outcome, never a throw.
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
          rl.question(`${question} (Y/n) `, resolve);
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
      // `isTTY` is undefined (not false) when stdin is piped or redirected,
      // so a plain boolean coercion is exactly right here.
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
