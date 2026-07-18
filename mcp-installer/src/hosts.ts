/**
 * The host table — hardcoded ON PURPOSE.
 *
 * The MCP server deliberately hardcodes no catalog (it is a long-lived binary
 * whose baked-in knowledge would rot on a user's disk). The installer is the
 * opposite kind of artifact: it is re-downloaded fresh on every `npx` run, so
 * a table compiled into it is always as new as the release the user just
 * fetched. A remotely fetched table would be worse than staleness — it would
 * turn the installer into a remote-controlled home-directory writer.
 * Updates to this table therefore ship only as releases.
 *
 * Three tiers, in strictly decreasing trust of our own writes:
 *   1 — vendor CLI spawn. No file contact; format, comments and atomicity are
 *       the vendor's problem.
 *   2 — direct file write, ONLY for configs verified to be strict JSON.
 *       Every write goes through the hygiene floor in `write-json.ts`.
 *   3 — detect + print a snippet, never write. JSONC dialects (a rewrite
 *       destroys comments), TOML (no parser without a dependency), and any
 *       path we could not verify against official docs. A confident refusal
 *       beats a false success that only surfaces after the user restarts
 *       their app.
 */
import type { Io } from "./types.js";

export const SERVER_NAME = "datalab";
export const SERVER_PACKAGE = "@modootoday/datalab-extension-mcp";
/** The gateway's default port — omitted from configs to keep them minimal. */
export const DEFAULT_PORT = "8765";

/**
 * The published Chrome Web Store extension id — a fixed, public value (it is in
 * the store URL). Used as the default in the interactive flow so a normal user
 * only has to paste the token; the extension id is not something a
 * non-technical person can be asked to produce. A dev build or a different
 * browser store has a different id and must pass `--extension-id` (which the
 * panel's copy button fills in automatically from the live origin).
 */
export const DEFAULT_EXTENSION_ID = "ldoknfkedngbdfgdkeicojmhnojgpdcb";

export interface ServerEntryOptions {
  version: string;
  token: string;
  extensionId: string;
  port?: string;
}

export function packageSpec(version: string): string {
  return `${SERVER_PACKAGE}@${version}`;
}

function isCustomPort(port: string | undefined): port is string {
  if (port === undefined || port === "") {
    return false;
  }
  return port !== DEFAULT_PORT;
}

export function buildEnv(opts: ServerEntryOptions): Record<string, string> {
  const env: Record<string, string> = {
    DATALAB_MCP_TOKEN: opts.token,
    DATALAB_MCP_EXTENSION_ID: opts.extensionId,
  };
  if (isCustomPort(opts.port)) {
    env["DATALAB_MCP_PORT"] = opts.port;
  }
  return env;
}

/** A host spawns our stdio adapter. */
export interface StdioFileEntry {
  command: string;
  args: string[];
  env: Record<string, string>;
}

/** A host connects to the daemon's HTTP endpoint directly (no adapter). */
export interface UrlFileEntry {
  url: string;
}

export type FileServerEntry = StdioFileEntry | UrlFileEntry;

/**
 * The daemon's MCP HTTP endpoint — 127.0.0.1 literal (never "localhost", which
 * resolves ::1-first on Windows). Hosts that speak HTTP MCP (Cursor) connect
 * here directly; no adapter process is spawned for them.
 */
export function daemonMcpUrl(opts: ServerEntryOptions): string {
  const port = isCustomPort(opts.port) ? opts.port : DEFAULT_PORT;
  return `http://127.0.0.1:${port}/mcp`;
}

export function buildUrlEntry(opts: ServerEntryOptions): UrlFileEntry {
  return { url: daemonMcpUrl(opts) };
}

/**
 * The JSON config entry Tier-2/3 hosts receive.
 *
 * On Windows the command must be `cmd /c npx`: npx is a `.cmd` shim there,
 * and host apps spawn config entries without a shell, so a bare "npx" fails
 * silently. Tier-1 CLI registrations keep plain "npx" — the vendor CLIs
 * handle shells themselves.
 */
export function buildFileEntry(
  opts: ServerEntryOptions,
  platform: string,
): FileServerEntry {
  const spec = packageSpec(opts.version);
  if (platform === "win32") {
    return {
      command: "cmd",
      args: ["/c", "npx", "-y", spec],
      env: buildEnv(opts),
    };
  }
  return {
    command: "npx",
    args: ["-y", spec],
    env: buildEnv(opts),
  };
}

// ---------------------------------------------------------------------------
// Tier 1 — official CLIs
// ---------------------------------------------------------------------------

export interface CliHost {
  id: string;
  tier: 1;
  displayName: string;
  /** Binary probed with `--version` for detection. */
  bin: string;
  /** Extra line printed after this host's result (e.g. the Codex/ChatGPT pairing). */
  note?: string;
  buildAddArgs(opts: ServerEntryOptions): string[];
  buildRemoveArgs(): string[];
}

export const CODEX_CHATGPT_NOTE = "ChatGPT 데스크톱과 함께 연결돼요.";

function envPairs(opts: ServerEntryOptions): string[] {
  const pairs = [
    `DATALAB_MCP_TOKEN=${opts.token}`,
    `DATALAB_MCP_EXTENSION_ID=${opts.extensionId}`,
  ];
  if (isCustomPort(opts.port)) {
    pairs.push(`DATALAB_MCP_PORT=${opts.port}`);
  }
  return pairs;
}

export const CLI_HOSTS: CliHost[] = [
  {
    id: "claude",
    tier: 1,
    displayName: "Claude Code",
    bin: "claude",
    // --scope user is mandatory: the default "local" scope binds the server to
    // whatever directory the user happened to paste the command in, which
    // looks like a success and then silently does nothing everywhere else.
    buildAddArgs(opts) {
      const args = ["mcp", "add", SERVER_NAME, "--scope", "user"];
      for (const pair of envPairs(opts)) {
        args.push("--env", pair);
      }
      args.push("--", "npx", "-y", packageSpec(opts.version));
      return args;
    },
    buildRemoveArgs() {
      return ["mcp", "remove", SERVER_NAME, "--scope", "user"];
    },
  },
  {
    id: "codex",
    tier: 1,
    displayName: "ChatGPT 데스크톱 / Codex",
    bin: "codex",
    // The Codex CLI and the ChatGPT desktop app share one config, so a single
    // registration covers both — worth saying out loud in the output.
    note: CODEX_CHATGPT_NOTE,
    buildAddArgs(opts) {
      const args = ["mcp", "add", SERVER_NAME];
      for (const pair of envPairs(opts)) {
        args.push("--env", pair);
      }
      args.push("--", "npx", "-y", packageSpec(opts.version));
      return args;
    },
    buildRemoveArgs() {
      return ["mcp", "remove", SERVER_NAME];
    },
  },
  {
    id: "gemini",
    tier: 1,
    displayName: "Gemini CLI",
    bin: "gemini",
    // -s user for the same cwd-binding reason as Claude Code's --scope user.
    buildAddArgs(opts) {
      const args = ["mcp", "add", "-s", "user"];
      for (const pair of envPairs(opts)) {
        args.push("-e", pair);
      }
      args.push(SERVER_NAME, "npx", "-y", packageSpec(opts.version));
      return args;
    },
    buildRemoveArgs() {
      return ["mcp", "remove", "-s", "user", SERVER_NAME];
    },
  },
];

// ---------------------------------------------------------------------------
// Offer-to-install CLIs (only when NOTHING is detected)
// ---------------------------------------------------------------------------

/**
 * Node-based MCP host CLIs the installer can offer to `npm install -g` when a
 * scan finds zero hosts. This is the "you have Node but no AI app yet" exit:
 * rather than dead-ending on a link list, we let the user pick one and install
 * it in place — but the pick is always optional (declining is a first-class
 * choice, never forced). Only these three because they are (a) pure npm
 * globals, so a machine that already ran `npx` can install them, and (b) MCP
 * hosts this installer already knows how to register (their ids match
 * CLI_HOSTS, so the post-install re-scan wires them up with no special case).
 */
export interface InstallableCli {
  /** Matches the CLI_HOSTS id, so a re-scan connects it with no extra mapping. */
  id: string;
  displayName: string;
  npmPackage: string;
}

export const INSTALLABLE_CLIS: InstallableCli[] = [
  {
    id: "claude",
    displayName: "Claude Code",
    npmPackage: "@anthropic-ai/claude-code",
  },
  { id: "gemini", displayName: "Gemini CLI", npmPackage: "@google/gemini-cli" },
  {
    id: "codex",
    displayName: "ChatGPT 데스크톱 / Codex",
    npmPackage: "@openai/codex",
  },
];

// ---------------------------------------------------------------------------
// Tier 2 — verified strict-JSON files
// ---------------------------------------------------------------------------

type PathIo = Pick<Io, "platform" | "homedir" | "env">;

function joinPath(io: PathIo, ...parts: string[]): string {
  if (io.platform === "win32") {
    return parts.join("\\");
  }
  return parts.join("/");
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
  /** null = this host is not Tier 2 on this platform (e.g. Claude Desktop on Linux). */
  configPath(io: PathIo): string | null;
}

export const FILE_HOSTS: FileHost[] = [
  {
    id: "claude-desktop",
    tier: 2,
    displayName: "Claude Desktop",
    configKey: "mcpServers",
    entryKind: "stdio",
    configPath(io) {
      if (io.platform === "darwin") {
        return joinPath(
          io,
          io.homedir(),
          "Library",
          "Application Support",
          "Claude",
          "claude_desktop_config.json",
        );
      }
      if (io.platform === "win32") {
        const appData = io.env["APPDATA"];
        if (appData === undefined || appData === "") {
          return null;
        }
        return joinPath(io, appData, "Claude", "claude_desktop_config.json");
      }
      // Linux: the official docs name no config path — Tier 3 handles it.
      return null;
    },
  },
  {
    id: "cursor",
    tier: 2,
    displayName: "Cursor",
    configKey: "mcpServers",
    // Cursor speaks local HTTP MCP, so it connects to the daemon directly
    // (url entry) — no adapter process spawned for it.
    entryKind: "url",
    configPath(io) {
      return joinPath(io, io.homedir(), ".cursor", "mcp.json");
    },
  },
  {
    // Windsurf's config is documented strict JSON with an `mcpServers` map, so
    // it graduates from a printed snippet to a safe single-key merge. The
    // hygiene floor still refuses (and falls back to a snippet) if a given
    // install turns out to carry comments, so the promotion cannot corrupt.
    id: "windsurf",
    tier: 2,
    displayName: "Windsurf",
    configKey: "mcpServers",
    entryKind: "stdio",
    configPath(io) {
      return joinPath(
        io,
        io.homedir(),
        ".codeium",
        "windsurf",
        "mcp_config.json",
      );
    },
  },
  {
    // Amazon Q Developer's global MCP config is strict JSON at a fixed,
    // home-relative path on every OS. We merge the file directly rather than
    // shelling out to `q mcp add`, because the file path gives us a clean
    // symmetric uninstall without depending on a remove subcommand we have
    // not verified.
    id: "amazon-q",
    tier: 2,
    displayName: "Amazon Q Developer",
    configKey: "mcpServers",
    entryKind: "stdio",
    configPath(io) {
      return joinPath(io, io.homedir(), ".aws", "amazonq", "mcp.json");
    },
  },
  {
    // JetBrains Junie — documented strict-JSON user config, home-relative on
    // every OS.
    id: "junie",
    tier: 2,
    displayName: "JetBrains Junie",
    configKey: "mcpServers",
    entryKind: "stdio",
    configPath(io) {
      return joinPath(io, io.homedir(), ".junie", "mcp", "mcp.json");
    },
  },
  {
    // Kiro — documented strict-JSON user settings, home-relative on every OS.
    id: "kiro",
    tier: 2,
    displayName: "Kiro",
    configKey: "mcpServers",
    entryKind: "stdio",
    configPath(io) {
      return joinPath(io, io.homedir(), ".kiro", "settings", "mcp.json");
    },
  },
];

/** The config entry a Tier-2 host receives, chosen by its entryKind. */
export function buildEntryForHost(
  host: FileHost,
  opts: ServerEntryOptions,
  platform: string,
): FileServerEntry {
  if (host.entryKind === "url") {
    return buildUrlEntry(opts);
  }
  return buildFileEntry(opts, platform);
}

// ---------------------------------------------------------------------------
// Tier 3 — detect + snippet, never write
// ---------------------------------------------------------------------------

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
  /** Why we refuse to write. Always contains "자동 수정하지 않아요". */
  reason: string;
  /** Where to paste the snippet, in Korean. */
  pasteWhere: string;
  buildSnippet(opts: ServerEntryOptions, platform: string): string;
}

function jsonSnippet(
  topKey: string,
  opts: ServerEntryOptions,
  platform: string,
): string {
  const entry = buildFileEntry(opts, platform);
  return JSON.stringify({ [topKey]: { [SERVER_NAME]: entry } }, null, 2);
}

/**
 * The VS Code per-user data dir (`.../Code/User`). Shared by VS Code's own
 * `mcp.json` and by the VS Code EXTENSIONS (Cline, Roo Code) that keep their
 * MCP config under `User/globalStorage/<ext>/...`. Only the stable "Code"
 * (not Insiders / VSCodium) variant is resolved — the others are opt-in
 * rebrands whose dir names we would only be guessing at.
 */
function vscodeUserDir(io: PathIo): string | null {
  if (io.platform === "darwin") {
    return joinPath(
      io,
      io.homedir(),
      "Library",
      "Application Support",
      "Code",
      "User",
    );
  }
  if (io.platform === "win32") {
    const appData = io.env["APPDATA"];
    if (appData === undefined || appData === "") {
      return null;
    }
    return joinPath(io, appData, "Code", "User");
  }
  return joinPath(io, io.homedir(), ".config", "Code", "User");
}

function vscodeConfigPath(io: PathIo): string | null {
  const dir = vscodeUserDir(io);
  if (dir === null) {
    return null;
  }
  return joinPath(io, dir, "mcp.json");
}

/**
 * A VS Code extension's MCP settings file, under `User/globalStorage/<ext>/`.
 * Returns null on Windows when APPDATA is unset (same guard as VS Code itself).
 */
function vscodeExtSettingsPath(
  io: PathIo,
  ext: string,
  file: string,
): string | null {
  const dir = vscodeUserDir(io);
  if (dir === null) {
    return null;
  }
  return joinPath(io, dir, "globalStorage", ext, "settings", file);
}

async function fileOrParentExists(io: Io, path: string): Promise<boolean> {
  if (await io.exists(path)) {
    return true;
  }
  const cut = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  if (cut <= 0) {
    return false;
  }
  return io.exists(path.slice(0, cut));
}

/**
 * Emits the TOML block for Codex without any TOML library: we only ever
 * WRITE these five keys, and every interpolated value passed the validation
 * regexes (hex token, a-p extension id, digits-only port, dotted version),
 * so no escaping case can arise.
 */
function tomlSnippet(opts: ServerEntryOptions): string {
  const lines = [
    `[mcp_servers.${SERVER_NAME}]`,
    `command = "npx"`,
    `args = ["-y", "${packageSpec(opts.version)}"]`,
    "",
    `[mcp_servers.${SERVER_NAME}.env]`,
  ];
  for (const [key, value] of Object.entries(buildEnv(opts))) {
    lines.push(`${key} = "${value}"`);
  }
  return lines.join("\n");
}

export const SNIPPET_HOSTS: SnippetHost[] = [
  {
    id: "vscode",
    tier: 3,
    displayName: "VS Code",
    async detect(io) {
      const path = vscodeConfigPath(io);
      if (path === null) {
        return false;
      }
      return fileOrParentExists(io, path);
    },
    detectedPath(io) {
      return vscodeConfigPath(io);
    },
    reason: "주석이 있는 설정 파일이라 자동 수정하지 않아요.",
    pasteWhere:
      '아래 내용을 설정 파일의 "servers" 항목에 직접 붙여넣어 주세요.',
    buildSnippet(opts, platform) {
      return jsonSnippet("servers", opts, platform);
    },
  },
  {
    id: "zed",
    tier: 3,
    displayName: "Zed",
    async detect(io) {
      return fileOrParentExists(
        io,
        joinPath(io, io.homedir(), ".config", "zed", "settings.json"),
      );
    },
    detectedPath(io) {
      return joinPath(io, io.homedir(), ".config", "zed", "settings.json");
    },
    reason: "주석이 있는 설정 파일이라 자동 수정하지 않아요.",
    pasteWhere:
      '아래 내용을 설정 파일의 "context_servers" 항목에 직접 붙여넣어 주세요.',
    buildSnippet(opts, platform) {
      return jsonSnippet("context_servers", opts, platform);
    },
  },
  {
    // Cline (VS Code extension). Its settings file is machine-written strict
    // JSON with an `mcpServers` map, but it sits under VS Code's per-variant
    // globalStorage dir; rather than auto-write a path that shifts with the
    // editor variant, we detect the stable-"Code" location and print a snippet.
    id: "cline",
    tier: 3,
    displayName: "Cline (VS Code)",
    async detect(io) {
      const path = vscodeExtSettingsPath(
        io,
        "saoudrizwan.claude-dev",
        "cline_mcp_settings.json",
      );
      if (path === null) {
        return false;
      }
      return fileOrParentExists(io, path);
    },
    detectedPath(io) {
      return vscodeExtSettingsPath(
        io,
        "saoudrizwan.claude-dev",
        "cline_mcp_settings.json",
      );
    },
    reason: "설정 파일 위치가 편집기 버전마다 달라서 자동 수정하지 않아요.",
    pasteWhere:
      '아래 내용을 설정 파일의 "mcpServers" 항목에 직접 붙여넣어 주세요.',
    buildSnippet(opts, platform) {
      return jsonSnippet("mcpServers", opts, platform);
    },
  },
  {
    // Roo Code (VS Code extension) — same globalStorage story as Cline.
    id: "roo-code",
    tier: 3,
    displayName: "Roo Code (VS Code)",
    async detect(io) {
      const path = vscodeExtSettingsPath(
        io,
        "rooveterinaryinc.roo-cline",
        "mcp_settings.json",
      );
      if (path === null) {
        return false;
      }
      return fileOrParentExists(io, path);
    },
    detectedPath(io) {
      return vscodeExtSettingsPath(
        io,
        "rooveterinaryinc.roo-cline",
        "mcp_settings.json",
      );
    },
    reason: "설정 파일 위치가 편집기 버전마다 달라서 자동 수정하지 않아요.",
    pasteWhere:
      '아래 내용을 설정 파일의 "mcpServers" 항목에 직접 붙여넣어 주세요.',
    buildSnippet(opts, platform) {
      return jsonSnippet("mcpServers", opts, platform);
    },
  },
  {
    // LM Studio — same `mcpServers` shape ("Cursor notation"). The exact path
    // is only medium-confidence, so it stays a snippet: a wrong detect just
    // means no card (safe), where a wrong auto-write would be a false success.
    id: "lmstudio",
    tier: 3,
    displayName: "LM Studio",
    async detect(io) {
      return fileOrParentExists(
        io,
        joinPath(io, io.homedir(), ".lmstudio", "mcp.json"),
      );
    },
    detectedPath(io) {
      return joinPath(io, io.homedir(), ".lmstudio", "mcp.json");
    },
    reason: "설정 파일 경로가 공식적으로 확정되지 않아 자동 수정하지 않아요.",
    pasteWhere:
      '아래 내용을 설정 파일의 "mcpServers" 항목에 직접 붙여넣어 주세요.',
    buildSnippet(opts, platform) {
      return jsonSnippet("mcpServers", opts, platform);
    },
  },
  {
    // Warp terminal — same `mcpServers` shape at `~/.warp/.mcp.json`
    // (medium-confidence path → snippet, not auto-write).
    id: "warp",
    tier: 3,
    displayName: "Warp",
    async detect(io) {
      return fileOrParentExists(
        io,
        joinPath(io, io.homedir(), ".warp", ".mcp.json"),
      );
    },
    detectedPath(io) {
      return joinPath(io, io.homedir(), ".warp", ".mcp.json");
    },
    reason: "설정 파일 경로가 공식적으로 확정되지 않아 자동 수정하지 않아요.",
    pasteWhere:
      '아래 내용을 설정 파일의 "mcpServers" 항목에 직접 붙여넣어 주세요.',
    buildSnippet(opts, platform) {
      return jsonSnippet("mcpServers", opts, platform);
    },
  },
  {
    id: "claude-desktop-linux",
    tier: 3,
    displayName: "Claude Desktop (Linux)",
    async detect(io) {
      if (io.platform !== "linux") {
        return false;
      }
      return io.exists(joinPath(io, io.homedir(), ".config", "Claude"));
    },
    detectedPath(io) {
      return joinPath(io, io.homedir(), ".config", "Claude");
    },
    // Guessing a path here would manufacture false successes that only
    // surface after a restart — the worst possible failure mode.
    reason:
      "리눅스용 공식 설정 파일 경로가 확인되지 않아 자동 수정하지 않아요.",
    pasteWhere:
      "Claude Desktop 공식 문서가 안내하는 설정 파일(claude_desktop_config.json)에 아래 내용을 직접 붙여넣어 주세요.",
    buildSnippet(opts, platform) {
      return jsonSnippet("mcpServers", opts, platform);
    },
  },
  {
    id: "codex-config-only",
    tier: 3,
    displayName: "ChatGPT 데스크톱 / Codex (설정 파일만 발견)",
    async detect(io, ctx) {
      // Only when the Codex CLI itself is absent — with the CLI present,
      // Tier 1 owns this host and writing TOML ourselves is forbidden.
      if (ctx.cliDetected.has("codex")) {
        return false;
      }
      return io.exists(joinPath(io, io.homedir(), ".codex", "config.toml"));
    },
    detectedPath(io) {
      return joinPath(io, io.homedir(), ".codex", "config.toml");
    },
    reason:
      "Codex 명령어(CLI)가 설치되어 있지 않아 TOML 설정 파일을 자동 수정하지 않아요.",
    pasteWhere: "아래 내용을 위 설정 파일에 직접 붙여넣어 주세요.",
    buildSnippet(opts) {
      return tomlSnippet(opts);
    },
  },
];

/** Shown when nothing was detected — the user needs somewhere to go next. */
export const SUPPORTED_APPS: Array<{ name: string; url: string }> = [
  { name: "Claude Desktop", url: "https://claude.ai/download" },
  { name: "Claude Code", url: "https://claude.com/claude-code" },
  { name: "ChatGPT 데스크톱", url: "https://openai.com/chatgpt/download/" },
  { name: "Codex CLI", url: "https://developers.openai.com/codex/" },
  { name: "Gemini CLI", url: "https://github.com/google-gemini/gemini-cli" },
  { name: "Cursor", url: "https://cursor.com/downloads" },
  { name: "Windsurf", url: "https://windsurf.com/download" },
  { name: "Amazon Q Developer", url: "https://aws.amazon.com/q/developer/" },
  { name: "JetBrains Junie", url: "https://www.jetbrains.com/junie/" },
  { name: "Kiro", url: "https://kiro.dev/" },
  { name: "VS Code", url: "https://code.visualstudio.com/" },
  { name: "Zed", url: "https://zed.dev/download" },
  { name: "Cline", url: "https://cline.bot/" },
  { name: "Roo Code", url: "https://roocode.com/" },
  { name: "LM Studio", url: "https://lmstudio.ai/" },
  { name: "Warp", url: "https://www.warp.dev/" },
];
