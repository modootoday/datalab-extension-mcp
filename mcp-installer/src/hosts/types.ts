/**
 * The shapes a vendor descriptor may declare — vendor-agnostic.
 *
 * Three tiers, in decreasing trust of our own writes: spawn the vendor CLI;
 * write the file, but only for configs verified as strict JSON; or print a
 * snippet and never write. A confident refusal beats a false success.
 *
 * Shapes live here, not beside the registry that assembles them, so adding
 * a surface changes this file while adding a vendor changes only that vendor's.
 */
import type { Io } from "../types.js";
import type { ServerEntryOptions } from "./entries.js";
import type { PathIo } from "./paths.js";

// ---------------------------------------------------------------------------
// MCP config — the three tiers
// ---------------------------------------------------------------------------

export interface CliHost {
  id: string;
  tier: 1;
  displayName: string;
  /** Binary probed with `--version` for detection. */
  bin: string;
  /** Extra line printed after this host's result. */
  note?: string;
  buildAddArgs(opts: ServerEntryOptions): string[];
  buildRemoveArgs(): string[];
}

/**
 * Host CLIs the installer can offer to install globally when a scan finds none,
 * so a machine with Node but no AI app yet does not dead-end on a link list.
 * The pick is always optional; declining is a first-class outcome. Limited
 * to pure npm globals whose ids match a CLI host, so the re-scan afterwards
 * registers them with no special case.
 */
export interface InstallableCli {
  /** Matches the CLI_HOSTS id, so a re-scan connects it with no extra mapping. */
  id: string;
  displayName: string;
  npmPackage: string;
}

export interface FileHost {
  id: string;
  tier: 2;
  displayName: string;
  /** Top-level key holding the server map. Both Tier-2 hosts use mcpServers. */
  configKey: "mcpServers";
  /**
   * "stdio" spawns our adapter (Claude Desktop); "url" points the host at the
   * daemon's HTTP endpoint directly (Cursor — the one host that speaks local
   * HTTP MCP, so it needs no adapter process).
   */
  entryKind: "stdio" | "url";
  /** Null when this host is not file-writable on this platform. */
  configPath(io: PathIo): string | null;
  /**
   * Async resolver for a host whose real path can only be found by looking at
   * the filesystem. A result here wins; null falls back to the static path.
   *
   * Needed because a Windows Store install redirects app-data writes into
   * its package container. Writing to the plain location there reports success,
   * leaves a backup, and is never read by the app.
   */
  resolveConfigPath?(io: Io): Promise<string | null>;
}

export interface SnippetContext {
  /** Ids of Tier-1 CLIs that responded — Codex demotion depends on it. */
  cliDetected: Set<string>;
}

export interface SnippetHost {
  id: string;
  tier: 3;
  displayName: string;
  detect(io: Io, ctx: SnippetContext): Promise<boolean>;
  /** Path (or directory) we detected — shown to the user when known. */
  detectedPath(io: PathIo): string | null;
  /** Why we refuse to write, in the user's language. */
  reason: string;
  /** Where to paste the snippet, in the user's language. */
  pasteWhere: string;
  /**
   * How to create the config file when it does not exist yet.
   *
   * These hosts create their config on first use inside the app, so a
   * missing file is the normal state and the user needs the one action that
   * creates it, not advice to reinstall.
   */
  createHint?: string;
  /**
   * May we create the file when it is absent?
   *
   * Writing is refused because an existing file cannot be merged safely,
   * and creating one is not a merge: nothing is damaged, the snippet is a
   * complete file, and an existing file is still never touched.
   *
   * Never enable this where the path is a guess: a file the app does not
   * read reports success and surfaces only after a restart.
   */
  bootstrapWhenAbsent?: boolean;
  /**
   * Our server's key in this host's TOML config, when the file can be merged.
   *
   * Set it and an existing config is edited rather than printed: write-toml
   * replaces only the span our own table occupies. Leave it unset for a host
   * whose format we cannot edit surgically -- the snippet is then the answer.
   */
  tomlServerName?: string;
  buildSnippet(opts: ServerEntryOptions, platform: string): string;
}

// ---------------------------------------------------------------------------
// Skills — two tiers only
// ---------------------------------------------------------------------------

/**
 * Where a vendor reads skills, or why we will not place them.
 *
 * There is no tier 1. Of the vendors that ship a skill command, none takes
 * a local directory — Claude and Codex document copying the folder, Gemini's
 * takes a URL. Spawning one would either repeat the copy we already do or
 * fetch over the network for a payload already on disk.
 *
 * Nine vendors share `~/.agents/skills/`, so a placement is never exclusive.
 * The write primitive proves ownership; a descriptor only says where.
 */
export type SkillPlacement =
  | {
      tier: 2;
      /** Null when this vendor has no skills directory on this platform. */
      skillsDir(io: PathIo): string | null;
    }
  | {
      tier: 3;
      /** Why we will not place, in the user's language. */
      reason: string;
      /** What the user should do instead, in the user's language. */
      instruction: string;
    };

/**
 * One vendor, both surfaces.
 *
 * `skills` is never optional. A vendor added without stating a tier would
 * ship silently unhandled, which is the failure this whole table exists to
 * avoid — a refusal is a decision, an omission is not.
 */
export interface HostDescriptor {
  id: string;
  displayName: string;
  skills: SkillPlacement;
}
