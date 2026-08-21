/**
 * Harnesses for the two testing modes: a fully in-memory seam for flow tests
 * that never touches disk, and a real-filesystem one scoped to a temp home for
 * the hygiene tests that must byte-assert what actually lands.
 */
import type { Io, SpawnResult } from "../src/types.js";
import { createNodeIo } from "../src/io.js";

export interface MemIoSetup {
  platform?: string;
  home?: string;
  files?: Record<string, string>;
  dirs?: string[];
  /** Binaries whose spawn resolves with exit code 0. */
  cliBins?: string[];
  answers?: string[];
  /** Queued free-text answers for the prompt, such as a pasted token. */
  prompts?: string[];
  /** Whether a human is reported to be at the keyboard. Defaults to true. */
  interactive?: boolean;
  env?: Record<string, string | undefined>;
}

export interface MemIoHarness {
  io: Io;
  files: Map<string, string>;
  out: string[];
  spawns: Array<{ command: string; args: string[]; shell: boolean }>;
  asks: string[];
  prompts: string[];
  writes: string[];
}

function parentDirs(path: string): string[] {
  const dirs: string[] = [];
  let current = path;
  while (true) {
    const cut = current.lastIndexOf("/");
    if (cut <= 0) {
      break;
    }
    current = current.slice(0, cut);
    dirs.push(current);
  }
  return dirs;
}

export function createMemIo(setup: MemIoSetup = {}): MemIoHarness {
  const home = setup.home ?? "/home/user";
  const files = new Map(Object.entries(setup.files ?? {}));
  const explicitDirs = new Set(setup.dirs ?? []);
  const cliBins = new Set(setup.cliBins ?? []);
  const answers = [...(setup.answers ?? [])];
  const promptAnswers = [...(setup.prompts ?? [])];
  const out: string[] = [];
  const spawns: MemIoHarness["spawns"] = [];
  const asks: string[] = [];
  const promptsAsked: string[] = [];
  const writes: string[] = [];
  let tick = 0;

  function knownDirs(): Set<string> {
    const dirs = new Set(explicitDirs);
    for (const filePath of files.keys()) {
      for (const dir of parentDirs(filePath)) {
        dirs.add(dir);
      }
    }
    for (const dir of explicitDirs) {
      for (const parent of parentDirs(dir)) {
        dirs.add(parent);
      }
    }
    return dirs;
  }

  const io: Io = {
    platform: setup.platform ?? "linux",
    // Nothing in a test may reach a real port: a developer running the
    // connector would have it ended by the install flow's reclaim step.
    fetch: (() => Promise.reject(new Error("ECONNREFUSED"))) as typeof fetch,
    homedir() {
      return home;
    },
    env: setup.env ?? {},
    async readFile(path) {
      const content = files.get(path);
      if (content === undefined) {
        throw Object.assign(new Error(`ENOENT: ${path}`), { code: "ENOENT" });
      }
      return content;
    },
    async writeFile(path, content) {
      writes.push(path);
      files.set(path, content);
    },
    async rename(from, to) {
      const content = files.get(from);
      if (content === undefined) {
        throw Object.assign(new Error(`ENOENT: ${from}`), { code: "ENOENT" });
      }
      files.set(to, content);
      files.delete(from);
    },
    async mkdir(path) {
      explicitDirs.add(path);
    },
    async unlink(path) {
      if (!files.delete(path)) {
        throw Object.assign(new Error(`ENOENT: ${path}`), { code: "ENOENT" });
      }
    },
    // Refuses a non-empty directory, like rmdir(2). A double that always
    // succeeded would let a caller delete a user's file and still pass.
    async rmdir(path) {
      const prefix = `${path}/`;
      for (const known of files.keys()) {
        if (known.startsWith(prefix)) {
          throw Object.assign(new Error(`ENOTEMPTY: ${path}`), {
            code: "ENOTEMPTY",
          });
        }
      }
      for (const known of [...explicitDirs]) {
        if (known.startsWith(prefix)) {
          throw Object.assign(new Error(`ENOTEMPTY: ${path}`), {
            code: "ENOTEMPTY",
          });
        }
      }
      explicitDirs.delete(path);
    },
    async exists(path) {
      if (files.has(path)) {
        return true;
      }
      return knownDirs().has(path);
    },
    // Directories too, like readdir — a double that returned only files made
    // a payload reader look empty when its tree was one level deeper.
    async listDir(dir) {
      const names = new Set<string>();
      const prefix = `${dir}/`;
      for (const filePath of files.keys()) {
        if (!filePath.startsWith(prefix)) {
          continue;
        }
        const rest = filePath.slice(prefix.length);
        const cut = rest.indexOf("/");
        names.add(cut === -1 ? rest : rest.slice(0, cut));
      }
      for (const known of explicitDirs) {
        if (known.startsWith(prefix)) {
          const rest = known.slice(prefix.length);
          const cut = rest.indexOf("/");
          names.add(cut === -1 ? rest : rest.slice(0, cut));
        }
      }
      return [...names];
    },
    async spawn(command, args, opts): Promise<SpawnResult> {
      spawns.push({ command, args, shell: opts.shell });
      if (cliBins.has(command)) {
        return { code: 0 };
      }
      return { code: 1 };
    },
    async ask(question) {
      asks.push(question);
      const answer = answers.shift();
      if (answer === undefined) {
        return "";
      }
      return answer;
    },
    async prompt(question) {
      promptsAsked.push(question);
      const answer = promptAnswers.shift();
      return answer === undefined ? "" : answer;
    },
    isInteractive() {
      return setup.interactive ?? true;
    },
    out(line) {
      out.push(line);
    },
    now() {
      tick += 1;
      return new Date(Date.UTC(2026, 0, 1, 0, 0, tick));
    },
  };

  return { io, files, out, spawns, asks, prompts: promptsAsked, writes };
}

export interface TempIoSetup {
  home: string;
  platform?: string;
  overrides?: Partial<Io>;
}

export interface TempIoHarness {
  io: Io;
  out: string[];
}

export function createTempIo(setup: TempIoSetup): TempIoHarness {
  const base = createNodeIo();
  const out: string[] = [];
  let tick = 0;
  const io: Io = {
    ...base,
    platform: setup.platform ?? "linux",
    // Nothing in a test may reach a real port: a developer running the
    // connector would have it ended by the install flow's reclaim step.
    fetch: (() => Promise.reject(new Error("ECONNREFUSED"))) as typeof fetch,
    homedir() {
      return setup.home;
    },
    env: {},
    async spawn() {
      // No vendor CLI ever exists in the hygiene tests.
      return { code: 1 };
    },
    async ask() {
      return "y";
    },
    async prompt() {
      return "";
    },
    isInteractive() {
      return true;
    },
    out(line) {
      out.push(line);
    },
    now() {
      // Deterministic and strictly increasing: backup rotation sorts on it.
      tick += 1;
      return new Date(Date.UTC(2026, 0, 1, 0, 0, tick));
    },
    ...setup.overrides,
  };
  return { io, out };
}

export const VALID_TOKEN = "0123456789abcdef0123456789abcdef";
export const VALID_EXTENSION_ID = "abcdefghijklmnopabcdefghijklmnop";
