/**
 * The I/O seam — every syscall the installer makes goes through this interface.
 *
 * 🔴 The installer's whole job is mutating other people's config files, which
 * must be testable without a real home directory. Everything outside the
 * production wiring stays pure against this interface.
 */

export interface SpawnResult {
  /**
   * Exit code of the child. A failure to spawn at all resolves as a non-zero
   * code rather than rejecting: an absent CLI is an expected detection
   * outcome, not an exception.
   */
  code: number;
}

export interface Io {
  platform: string;
  homedir(): string;
  /** Environment map — needed for app-data resolution on Windows. */
  env: Record<string, string | undefined>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  /** Atomic within a filesystem — the temp file is always a sibling. */
  rename(from: string, to: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  /**
   * Lists entry names, not full paths. A missing directory resolves to empty.
   *
   * 🔴 Used both for backup rotation and for enumerating a Windows Store
   * package container, where the point is confirming a directory exists rather
   * than guessing its name.
   */
  listDir(dir: string): Promise<string[]>;
  unlink(path: string): Promise<void>;
  /**
   * Runs a vendor CLI. 🔴 A shell is only ever used on Windows, and only
   * because every interpolated value has already passed strict validation.
   */
  spawn(
    command: string,
    args: string[],
    opts: {
      shell: boolean;
      /**
       * Inherit the parent's stdio instead of discarding it. Off for
       * detection, whose noise would interleave with our output; on for a long
       * install, where a silent terminal reads as frozen.
       */
      inheritStdio?: boolean;
    },
  ): Promise<SpawnResult>;
  /** Asks the one yes/no question. Receives the bare question text. */
  ask(question: string): Promise<string>;
  /**
   * Reads one line of free text, such as a pasted pairing token. 🔴 Callers
   * must gate this behind the interactive check — a prompt down a pipe hangs
   * forever.
   */
  prompt(question: string): Promise<string>;
  /**
   * Is a human at a keyboard? False when stdin is piped, where a prompt is
   * impossible and the run must instead say how to pass the value in.
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
  /** Skip the confirmation question entirely. */
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
