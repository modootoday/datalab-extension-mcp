/**
 * The Io seam — every syscall the installer ever makes goes through this
 * interface.
 *
 * The installer's whole job is mutating other people's config files, which is
 * exactly the kind of code that must be testable without a real home
 * directory. Production wiring lives in `io.ts`; everything else is pure
 * against this interface, so the test matrix can run against an in-memory
 * filesystem (flow tests) or a throwaway temp dir (byte-level hygiene tests).
 */

export interface SpawnResult {
  /**
   * Exit code of the child. A failure to spawn at all (binary not found)
   * resolves as a non-zero code instead of rejecting — "CLI absent" is an
   * expected detection outcome, not an exception.
   */
  code: number;
}

export interface Io {
  /** `process.platform` shape: "darwin" | "win32" | "linux" | ... */
  platform: string;
  homedir(): string;
  /** Environment map — needed for %APPDATA% resolution on Windows. */
  env: Record<string, string | undefined>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  /** Atomic within a filesystem — the temp file is always a sibling. */
  rename(from: string, to: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  /**
   * Lists entry names (not full paths) in a directory. Used only for backup
   * rotation; a missing directory resolves to an empty list.
   */
  listBackups(dir: string): Promise<string[]>;
  unlink(path: string): Promise<void>;
  /**
   * Runs a vendor CLI. `shell` is only ever true on win32, and only because
   * every value interpolated into the argv has already passed the strict
   * validation regexes in `validate.ts` — see the comment in `run.ts`.
   */
  spawn(
    command: string,
    args: string[],
    opts: {
      shell: boolean;
      /**
       * Inherit the parent's stdio instead of discarding it. Off for detection
       * (`--version` noise would interleave with our output); ON for a long
       * `npm install -g` so the user sees npm's own progress rather than a
       * frozen-looking terminal.
       */
      inheritStdio?: boolean;
    },
  ): Promise<SpawnResult>;
  /** Asks the one Y/n question. Receives the bare question text. */
  ask(question: string): Promise<string>;
  /**
   * Reads one line of free text (e.g. the pairing token pasted in). Distinct
   * from `ask`, which is Y/n only. Callers MUST gate this behind
   * `isInteractive()` — a prompt down a pipe hangs forever, which is exactly
   * the "설치가 진행 안 됨" a non-TTY run produced before this existed.
   */
  prompt(question: string): Promise<string>;
  /**
   * Is a human at a keyboard? False when stdin is piped/redirected, where an
   * interactive prompt is impossible and the run must tell the user how to
   * pass the value on the command line instead.
   */
  isInteractive(): boolean;
  /** Prints one user-facing line (may contain embedded newlines). */
  out(line: string): void;
  /** Clock — injected so backup timestamps are deterministic in tests. */
  now(): Date;
}

export interface RunOptions {
  version: string;
  token?: string;
  extensionId?: string;
  port?: string;
  /** Skip the Y/n question entirely. */
  yes?: boolean;
  /** Restrict the run to these host ids. */
  hosts?: string[];
}

export type HostStatus = "success" | "failed" | "skipped";

export interface HostResult {
  hostId: string;
  displayName: string;
  tier: 1 | 2 | 3;
  status: HostStatus;
  message?: string;
  backupPath?: string;
}
