/**
 * The host table — hardcoded on purpose, since the installer is re-downloaded
 * on every run. 🔴 A remotely fetched table would make this a remote-controlled
 * home-directory writer.
 *
 * Three tiers, in decreasing trust of our own writes: spawn the vendor CLI;
 * write the file, but only for configs verified as strict JSON; or print a
 * snippet and never write. A confident refusal beats a false success.
 */
import type { Io } from "./types.js";

export const SERVER_NAME = "datalab";
export const SERVER_PACKAGE = "@modootoday/datalab-extension-mcp";
/** The gateway's default port — omitted from configs to keep them minimal. */
export const DEFAULT_PORT = "8765";

/**
 * The published store extension id — a fixed, public value. Defaulted in the
 * interactive flow so a non-technical user only has to paste the token. A dev
 * build or another browser store has a different id and must pass it in.
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
 * The daemon's MCP HTTP endpoint. 🔴 A literal IPv4 address, never "localhost",
 * which resolves IPv6-first on Windows. Hosts that speak HTTP MCP connect here
 * directly, with no adapter process spawned for them.
 */
export function daemonMcpUrl(opts: ServerEntryOptions): string {
  const port = isCustomPort(opts.port) ? opts.port : DEFAULT_PORT;
  return `http://127.0.0.1:${port}/mcp`;
}

export function buildUrlEntry(opts: ServerEntryOptions): UrlFileEntry {
  return { url: daemonMcpUrl(opts) };
}

/**
 * The JSON config entry a file-writing or snippet host receives.
 *
 * 🔴 On Windows the package runner is a .cmd shim and host apps spawn config
 * entries without a shell, so it must be invoked through the command
 * interpreter. Vendor CLI registrations handle their own shells.
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
  /** Extra line printed after this host's result. */
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
    // 🔴 User scope is mandatory: the default local scope binds the server to
    // whatever directory the command was pasted in, which reads as success and
    // then does nothing everywhere else.
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
    // The CLI and the desktop app share one config, so a single registration
    // covers both — worth saying out loud in the output.
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
    // User scope, for the same cwd-binding reason as the entry above.
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
 * Host CLIs the installer can offer to install globally when a scan finds none,
 * so a machine with Node but no AI app yet does not dead-end on a link list.
 * 🔴 The pick is always optional; declining is a first-class outcome. Limited
 * to pure npm globals whose ids match a CLI host, so the re-scan afterwards
 * registers them with no special case.
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

/**
 * Declarative mapping of host config paths.
 *
 * 🔴 A table rather than per-host assembly: deciding each app's convention by
 * hand means one wrong guess silently breaks one host on one platform.
 *
 * 🔴 Four conventions cover every host: a dot directory under home, the OS
 * app-data location, XDG that still goes to app data on Windows, and
 * home-relative config that stays under home there — the last two differ on
 * Windows alone, and that difference is the point.
 */
export interface HostPathSpec {
  kind: "home" | "appData" | "xdg" | "homeConfig";
  /** Path segments below the root, filename included. */
  segments: readonly string[];
  /**
   * Segments that differ on Windows. 🔴 Some apps differ only in the case of a
   * directory name; inferring a casing rule in code would be wrong for the next
   * host, so a difference is always stated outright.
   */
  win32Segments?: readonly string[];
  /** Valid only on these platforms. Omitted means all of them. */
  platforms?: readonly string[];
}

/** 🔴 The platform rules live here alone, never restated per host. */
function pathRoot(io: PathIo, kind: HostPathSpec["kind"]): string | null {
  if (kind === "home") {
    return io.homedir();
  }
  // Home-relative even on Windows — deliberately not the app-data location.
  if (kind === "homeConfig") {
    return joinPath(io, io.homedir(), ".config");
  }
  if (io.platform === "win32") {
    const appData = io.env["APPDATA"];
    // 🔴 Null rather than a guess: writing to the wrong place is a false
    // success.
    return appData === undefined || appData === "" ? null : appData;
  }
  if (kind === "appData" && io.platform === "darwin") {
    return joinPath(io, io.homedir(), "Library", "Application Support");
  }
  const xdg = io.env["XDG_CONFIG_HOME"];
  // XDG is a Linux convention; honouring it on macOS would point at a
  // directory the app never reads.
  if (
    kind === "xdg" &&
    io.platform === "linux" &&
    xdg !== undefined &&
    xdg !== ""
  ) {
    return xdg;
  }
  return joinPath(io, io.homedir(), ".config");
}

export function resolveHostPath(io: PathIo, spec: HostPathSpec): string | null {
  if (spec.platforms !== undefined && !spec.platforms.includes(io.platform)) {
    return null;
  }
  const root = pathRoot(io, spec.kind);
  if (root === null) {
    return null;
  }
  const segments =
    io.platform === "win32" && spec.win32Segments !== undefined
      ? spec.win32Segments
      : spec.segments;
  return joinPath(io, root, ...segments);
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
   * 🔴 Needed because a Windows Store install redirects app-data writes into
   * its package container. Writing to the plain location there reports success,
   * leaves a backup, and is never read by the app.
   */
  resolveConfigPath?(io: Io): Promise<string | null>;
}

/**
 * Find a Windows Store install's redirected config directory by enumerating the
 * package container.
 *
 * 🔴 Only a directory found by prefix scan AND confirmed to exist is returned.
 * Hardcoding the publisher hash would be a guess, and a file placed where the
 * app does not read is a false success. No match falls back to the plain path.
 */
async function msixRoamingDir(
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

export const FILE_HOSTS: FileHost[] = [
  {
    id: "claude-desktop",
    tier: 2,
    displayName: "Claude Desktop",
    configKey: "mcpServers",
    entryKind: "stdio",
    // 🔴 Linux has no documented path, so a snippet host covers it; guessing
    // one here would manufacture a false success.
    configPath(io) {
      return resolveHostPath(io, {
        kind: "appData",
        segments: ["Claude", "claude_desktop_config.json"],
        platforms: ["darwin", "win32"],
      });
    },
    /**
     * 🔴 A Store install writes inside its package container instead. The two
     * install kinds use entirely different locations and the app does not say
     * which it is, so an existing container wins and its absence falls back.
     */
    async resolveConfigPath(io) {
      const dir = await msixRoamingDir(io, "Claude_", "Claude");
      if (dir === null) {
        return null;
      }
      return joinPath(io, dir, "claude_desktop_config.json");
    },
  },
  {
    id: "cursor",
    tier: 2,
    displayName: "Cursor",
    configKey: "mcpServers",
    // Speaks local HTTP MCP, so it connects to the daemon directly and no
    // adapter process is spawned for it.
    entryKind: "url",
    configPath(io) {
      return resolveHostPath(io, {
        kind: "home",
        segments: [".cursor", "mcp.json"],
      });
    },
  },
  {
    // Documented strict JSON, so a single-key merge is safe. The hygiene floor
    // still refuses and falls back to a snippet if an install turns out to
    // carry comments.
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
    // 🔴 A home override env var wins when set. Ignoring it would write beside
    // the config the user moved, reporting success the app never sees.
    id: "copilot-cli",
    tier: 2,
    displayName: "GitHub Copilot CLI",
    configKey: "mcpServers",
    entryKind: "stdio",
    configPath(io) {
      const home = io.env["COPILOT_HOME"];
      if (home !== undefined && home !== "") {
        return joinPath(io, home, "mcp-config.json");
      }
      return resolveHostPath(io, {
        kind: "home",
        segments: [".copilot", "mcp-config.json"],
      });
    },
  },
  {
    // Documented strict-JSON user config, home-relative on every OS.
    id: "junie",
    tier: 2,
    displayName: "JetBrains Junie",
    configKey: "mcpServers",
    entryKind: "stdio",
    configPath(io) {
      return resolveHostPath(io, {
        kind: "home",
        segments: [".junie", "mcp", "mcp.json"],
      });
    },
  },
  {
    // Documented strict-JSON user settings, home-relative on every OS.
    id: "kiro",
    tier: 2,
    displayName: "Kiro",
    configKey: "mcpServers",
    entryKind: "stdio",
    configPath(io) {
      return resolveHostPath(io, {
        kind: "home",
        segments: [".kiro", "settings", "mcp.json"],
      });
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
  /** Why we refuse to write, in the user's language. */
  reason: string;
  /** Where to paste the snippet, in the user's language. */
  pasteWhere: string;
  /**
   * How to create the config file when it does not exist yet.
   *
   * 🔴 These hosts create their config on first use inside the app, so a
   * missing file is the normal state and the user needs the one action that
   * creates it, not advice to reinstall.
   */
  createHint?: string;
  /**
   * May we create the file when it is absent?
   *
   * 🔴 Writing is refused because an existing file cannot be merged safely,
   * and creating one is not a merge: nothing is damaged, the snippet is a
   * complete file, and an existing file is still never touched.
   *
   * 🔴 Never enable this where the path is a guess: a file the app does not
   * read reports success and surfaces only after a restart.
   */
  bootstrapWhenAbsent?: boolean;
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
 * The editor's per-user data directory. Only the stable variant is resolved;
 * the rebranded ones have directory names we would only be guessing at, and 🔴
 * a path we cannot verify against vendor documentation is one where pasting
 * the snippet does nothing at all.
 */
function vscodeUserDir(io: PathIo): string | null {
  return resolveHostPath(io, { kind: "appData", segments: ["Code", "User"] });
}

function vscodeConfigPath(io: PathIo): string | null {
  const dir = vscodeUserDir(io);
  if (dir === null) {
    return null;
  }
  return joinPath(io, dir, "mcp.json");
}

async function fileOrParentExists(
  io: Io,
  path: string | null,
): Promise<boolean> {
  // An unresolvable path counts as absent. Guarding for null at each call site
  // instead would eventually miss one.
  if (path === null) {
    return false;
  }
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
 * Emits the TOML block without a TOML library. 🔴 Safe only because we write a
 * fixed set of keys and every interpolated value has passed the strict
 * validation patterns, so no escaping case can arise.
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

/**
 * 🔴 This host's config path differs per platform, including the casing of the
 * directory name on Windows. The vendor's own documentation is the source; a
 * third-party registry table has it wrong for macOS.
 */
function zedConfigPath(io: PathIo): string | null {
  return resolveHostPath(io, {
    kind: "xdg",
    segments: ["zed", "settings.json"],
    win32Segments: ["Zed", "settings.json"],
  });
}

/** 🔴 One path definition per host, so detect and detectedPath cannot diverge. */
const LMSTUDIO_PATH: HostPathSpec = {
  kind: "home",
  segments: [".lmstudio", "mcp.json"],
};
const WARP_PATH: HostPathSpec = {
  kind: "home",
  segments: [".warp", ".mcp.json"],
};
/**
 * 🔴 Home-relative on every OS, Windows included — the app-data variant comes
 * from stale documentation and several tools have made that mistake. An
 * explicit config-directory env var overrides it.
 */
const OPENCODE_PATH: HostPathSpec = {
  kind: "homeConfig",
  segments: ["opencode", "opencode.json"],
};
/** The only path the vendor documentation states. */
const CLINE_PATH: HostPathSpec = {
  kind: "home",
  segments: [".cline", "mcp.json"],
};
const CODEX_PATH: HostPathSpec = {
  kind: "home",
  segments: [".codex", "config.toml"],
};

/**
 * 🔴 Not subject to Store package virtualisation: the redirect covers app data
 * and the registry, not the user-profile path this config lives under. The
 * vendor also documents its apps sharing one config, which virtualisation
 * would break. The home override matters under WSL, where the Linux home
 * would otherwise point at a different file from the Windows app's.
 */
function codexConfigPath(io: PathIo): string | null {
  const home = io.env["CODEX_HOME"];
  if (home !== undefined && home !== "") {
    return joinPath(io, home, "config.toml");
  }
  return resolveHostPath(io, CODEX_PATH);
}

/** The config-directory override when set, otherwise the documented path. */
function opencodeConfigPath(io: PathIo): string | null {
  const dir = io.env["OPENCODE_CONFIG_DIR"];
  if (dir !== undefined && dir !== "") {
    return joinPath(io, dir, "opencode.json");
  }
  return resolveHostPath(io, OPENCODE_PATH);
}

/**
 * 🔴 This host uses a different schema — its own top-level key, a type
 * discriminator, a single command array, and a differently named env map — so
 * the shared entry builder would emit a silently wrong shape that fails with
 * nothing written down anywhere.
 */
function opencodeSnippet(opts: ServerEntryOptions): string {
  return JSON.stringify(
    {
      mcp: {
        [SERVER_NAME]: {
          type: "local",
          command: ["npx", "-y", packageSpec(opts.version)],
          enabled: true,
          environment: buildEnv(opts),
        },
      },
    },
    null,
    2,
  );
}

/**
 * Is a Store package installed? Decided by package identity prefix.
 *
 * 🔴 Never by display name: those are mutable and localised, and a rebranded
 * app can share a display name with a legacy one that does not use this config
 * at all. Package identity does not change.
 */
async function msixPackageInstalled(
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

/**
 * 🔴 The package identity of the current Store desktop app, which does not
 * match its display name. The legacy app under the older name does not use
 * this config, and matching it too would show guidance nobody can act on.
 */
const CHATGPT_DESKTOP_PACKAGE = "OpenAI.Codex_";

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
    // 🔴 The hint names the profile too: a non-default profile keeps its own
    // config elsewhere, so pasting into the path above would not reach it.
    createHint:
      "파일이 없으면 VS Code 에서 명령 팔레트(Ctrl+Shift+P) → 'MCP: Open User Configuration' 을 실행하면 만들어져요. 기본 프로필이 아니면 그 프로필의 mcp.json 이 User/profiles 아래에 따로 있으니, 그 명령으로 열린 파일에 붙여넣어 주세요.",
    bootstrapWhenAbsent: true,
    buildSnippet(opts, platform) {
      return jsonSnippet("servers", opts, platform);
    },
  },
  {
    id: "opencode",
    tier: 3,
    displayName: "OpenCode",
    async detect(io) {
      return fileOrParentExists(io, opencodeConfigPath(io));
    },
    detectedPath(io) {
      return opencodeConfigPath(io);
    },
    reason: "도구 전체 설정 파일이라 자동 수정하지 않아요.",
    pasteWhere: '아래 내용을 설정 파일의 "mcp" 항목에 직접 붙여넣어 주세요.',
    // 🔴 Never created for this host: the file is the tool's whole config and a
    // sibling dialect may already hold it, so creating ours would leave two
    // config files with no way for the user to know which wins.
    createHint:
      "설정 파일은 opencode.json 또는 opencode.jsonc 예요. 쓰고 있는 쪽에 붙여넣어 주세요.",
    buildSnippet(opts) {
      return opencodeSnippet(opts);
    },
  },
  {
    id: "zed",
    tier: 3,
    displayName: "Zed",
    async detect(io) {
      const path = zedConfigPath(io);
      if (path === null) {
        return false;
      }
      return fileOrParentExists(io, path);
    },
    detectedPath(io) {
      return zedConfigPath(io);
    },
    reason: "주석이 있는 설정 파일이라 자동 수정하지 않아요.",
    pasteWhere:
      '아래 내용을 설정 파일의 "context_servers" 항목에 직접 붙여넣어 주세요.',
    buildSnippet(opts, platform) {
      return jsonSnippet("context_servers", opts, platform);
    },
  },
  {
    // 🔴 One documented path only. An unverified path from a third-party table
    // would have the user paste into a file nothing reads.
    id: "cline",
    tier: 3,
    displayName: "Cline",
    async detect(io) {
      return fileOrParentExists(io, resolveHostPath(io, CLINE_PATH));
    },
    detectedPath(io) {
      return resolveHostPath(io, CLINE_PATH);
    },
    reason: "설정 파일을 자동 수정하지 않아요.",
    pasteWhere:
      '아래 내용을 설정 파일의 "mcpServers" 항목에 직접 붙여넣어 주세요.',
    buildSnippet(opts, platform) {
      return jsonSnippet("mcpServers", opts, platform);
    },
  },
  {
    // Same entry shape, but the exact path is only medium-confidence, so it
    // stays a snippet: a wrong detection costs a missing card, while a wrong
    // auto-write would be a false success.
    id: "lmstudio",
    tier: 3,
    displayName: "LM Studio",
    async detect(io) {
      return fileOrParentExists(io, resolveHostPath(io, LMSTUDIO_PATH));
    },
    detectedPath(io) {
      return resolveHostPath(io, LMSTUDIO_PATH);
    },
    reason: "설정 파일 경로가 공식적으로 확정되지 않아 자동 수정하지 않아요.",
    pasteWhere:
      '아래 내용을 설정 파일의 "mcpServers" 항목에 직접 붙여넣어 주세요.',
    buildSnippet(opts, platform) {
      return jsonSnippet("mcpServers", opts, platform);
    },
  },
  {
    // Same entry shape, medium-confidence path — snippet, not auto-write.
    id: "warp",
    tier: 3,
    displayName: "Warp",
    async detect(io) {
      return fileOrParentExists(io, resolveHostPath(io, WARP_PATH));
    },
    detectedPath(io) {
      return resolveHostPath(io, WARP_PATH);
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
    // 🔴 Guessing a path here would manufacture a false success that only
    // surfaces after a restart.
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
      // Only when the CLI itself is absent — with it present, the CLI host
      // owns this app and writing the config ourselves is forbidden.
      if (ctx.cliDetected.has("codex")) {
        return false;
      }
      // 🔴 File-or-parent, like every other snippet host: the desktop app does
      // not install the CLI and does not create its config until a server is
      // first registered, so requiring the file would miss an installed app.
      if (await fileOrParentExists(io, codexConfigPath(io))) {
        return true;
      }
      // 🔴 A Store install may have neither yet, so package identity is what
      // proves the app is there and lets us offer to create the file.
      return msixPackageInstalled(io, CHATGPT_DESKTOP_PACKAGE);
    },
    detectedPath(io) {
      return codexConfigPath(io);
    },
    reason:
      "Codex 명령어(CLI)가 설치되어 있지 않아 TOML 설정 파일을 자동 수정하지 않아요.",
    pasteWhere: "아래 내용을 위 설정 파일에 직접 붙여넣어 주세요.",
    // The desktop app, the CLI, and the IDE extension share this one file.
    createHint:
      "파일이 없으면 ChatGPT 데스크톱에서 설정 → MCP 서버 → 서버 추가를 한 번 하면 만들어져요. 폴더가 없으면 직접 만들어도 돼요.",
    bootstrapWhenAbsent: true,
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
  { name: "JetBrains Junie", url: "https://www.jetbrains.com/junie/" },
  { name: "Kiro", url: "https://kiro.dev/" },
  { name: "GitHub Copilot CLI", url: "https://github.com/github/copilot-cli" },
  { name: "OpenCode", url: "https://opencode.ai/" },
  { name: "VS Code", url: "https://code.visualstudio.com/" },
  { name: "Zed", url: "https://zed.dev/download" },
  { name: "Cline", url: "https://cline.bot/" },
  { name: "LM Studio", url: "https://lmstudio.ai/" },
  { name: "Warp", url: "https://www.warp.dev/" },
];
