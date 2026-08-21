/**
 * The host matrix and the brand banner. A file host must write its strict-JSON
 * config; a snippet host must be detected, printed, and  never written. A
 * real temp home throughout, so both claims are proven on disk.
 */
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runInstall } from "../src/run.js";
import { FILE_HOSTS, SNIPPET_HOSTS, resolveHostPath } from "../src/hosts.js";
import { INSTALL_SUBTITLE } from "../src/banner.js";
import { VALID_EXTENSION_ID, VALID_TOKEN, createTempIo } from "./helpers.js";

const OPTS = {
  version: "1.2.3",
  token: VALID_TOKEN,
  extensionId: VALID_EXTENSION_ID,
  yes: true,
};

let home = "";

beforeEach(async () => {
  home = await fs.mkdtemp(join(tmpdir(), "mcp-installer-hosts-"));
});

afterEach(async () => {
  await fs.rm(home, { recursive: true, force: true });
});

async function datalabEntry(path: string): Promise<unknown> {
  const doc = JSON.parse(await fs.readFile(path, "utf8")) as {
    mcpServers?: Record<string, unknown>;
  };
  return doc.mcpServers?.["datalab"];
}

describe("brand banner", () => {
  it("prints the DATALAB art and the install subtitle first", async () => {
    const { io, out } = createTempIo({ home });
    // With no hosts detected, the banner must still lead the output.
    await runInstall(OPTS, io);
    const text = out.join("\n");
    expect(text).toContain("데이터랩툴즈 · datalab.tools");
    expect(text).toContain(`[데이터랩툴즈] ${INSTALL_SUBTITLE}`);
    // The wordmark is the very first non-empty line, and stays one line: a
    // screenful of block glyphs reads as something breaking.
    const firstNonEmpty = out.find((l) => l.trim() !== "");
    expect(firstNonEmpty).toContain("데이터랩툴즈 · datalab.tools");
    expect(out.some((l) => l.includes("█"))).toBe(false);
  });
});

describe("Tier 2 additions — auto-write strict JSON", () => {
  it("promotes Windsurf: writes mcp_config.json under ~/.codeium/windsurf", async () => {
    const dir = join(home, ".codeium", "windsurf");
    await fs.mkdir(dir, { recursive: true });
    const { io } = createTempIo({ home });

    const code = await runInstall(OPTS, io);
    expect(code).toBe(0);
    expect(await datalabEntry(join(dir, "mcp_config.json"))).toBeDefined();
  });

  /**
   * This host is deliberately unsupported: the vendor documents a different
   * global config location, and the file we would have written is read only
   * under an opt-in legacy flag. Reporting success on a conditionally read
   * file is reporting a falsehood.
   */
  it("does NOT write Amazon Q's legacy mcp.json", async () => {
    const dir = join(home, ".aws", "amazonq");
    await fs.mkdir(dir, { recursive: true });
    const { io, out } = createTempIo({ home });

    // This directory alone detects no host, so a non-zero exit is expected.
    await runInstall(OPTS, io);
    expect((await fs.readdir(dir)).sort()).toEqual([]);
    expect(out.join("\n")).not.toContain("Amazon Q");
  });

  it("writes JetBrains Junie config under ~/.junie/mcp", async () => {
    const dir = join(home, ".junie", "mcp");
    await fs.mkdir(dir, { recursive: true });
    const { io } = createTempIo({ home });

    const code = await runInstall(OPTS, io);
    expect(code).toBe(0);
    expect(await datalabEntry(join(dir, "mcp.json"))).toBeDefined();
  });

  it("writes Kiro config under ~/.kiro/settings", async () => {
    const dir = join(home, ".kiro", "settings");
    await fs.mkdir(dir, { recursive: true });
    const { io } = createTempIo({ home });

    const code = await runInstall(OPTS, io);
    expect(code).toBe(0);
    expect(await datalabEntry(join(dir, "mcp.json"))).toBeDefined();
  });
});

describe("Tier 3 additions — detect + snippet, never write", () => {
  /**
   * Only the one path the vendor documents. An unverified path from a
   * third-party table would have the user paste into a file nothing reads.
   */
  it("snippets Cline from the vendor-documented ~/.cline path", async () => {
    const dir = join(home, ".cline");
    await fs.mkdir(dir, { recursive: true });

    const { io, out } = createTempIo({ home });
    const code = await runInstall(OPTS, io);

    expect(code).toBe(0);
    // A snippet only; nothing is written.
    expect((await fs.readdir(dir)).sort()).toEqual([]);
    const text = out.join("\n");
    expect(text).toContain(join(dir, "mcp.json"));
    expect(text).toContain('"mcpServers"');
    expect(text).not.toContain("globalStorage");
  });

  it("snippets LM Studio from ~/.lmstudio without writing", async () => {
    const dir = join(home, ".lmstudio");
    await fs.mkdir(dir, { recursive: true });
    const { io, out } = createTempIo({ home });

    const code = await runInstall(OPTS, io);
    expect(code).toBe(0);
    expect((await fs.readdir(dir)).sort()).toEqual([]);

    const text = out.join("\n");
    expect(text).toContain("LM Studio");
    expect(text).toContain("자동 수정하지 않아요");
  });

  it("snippets Warp from ~/.warp without writing", async () => {
    const dir = join(home, ".warp");
    await fs.mkdir(dir, { recursive: true });
    const { io, out } = createTempIo({ home });

    const code = await runInstall(OPTS, io);
    expect(code).toBe(0);
    expect((await fs.readdir(dir)).sort()).toEqual([]);
    expect(out.join("\n")).toContain("Warp");
  });
});

describe("zero-detected — optional CLI install offer", () => {
  it("offers, installs the pick via npm, re-scans, and connects", async () => {
    const installed = new Set<string>();
    const spawns: string[] = [];
    const { io, out } = createTempIo({
      home,
      overrides: {
        isInteractive: () => true,
        async prompt() {
          return "1"; // pick Claude Code
        },
        async spawn(command: string, args: string[]) {
          spawns.push(`${command} ${args.join(" ")}`);
          if (command === "npm" && args[0] === "install") {
            installed.add("claude");
            return { code: 0 };
          }
          if (command === "claude") {
            // Detection only succeeds after the install has landed.
            return installed.has("claude") ? { code: 0 } : { code: 1 };
          }
          return { code: 1 };
        },
      },
    });

    const code = await runInstall(OPTS, io);
    expect(code).toBe(0);
    // Offered the pick, installed the right package, then registered it.
    expect(
      spawns.some((s) => s === "npm install -g @anthropic-ai/claude-code"),
    ).toBe(true);
    expect(spawns.some((s) => s.startsWith("claude mcp add"))).toBe(true);
    expect(out.join("\n")).toContain("Claude Code");
  });

  it("declining (option 0) changes nothing and lists supported apps", async () => {
    const spawns: string[] = [];
    const { io, out } = createTempIo({
      home,
      overrides: {
        isInteractive: () => true,
        async prompt() {
          return "0"; // decline
        },
        async spawn(command: string, args: string[]) {
          spawns.push(`${command} ${args.join(" ")}`);
          return { code: 1 };
        },
      },
    });

    const code = await runInstall(OPTS, io);
    expect(code).toBe(1);
    // Declining must never spawn an install.
    expect(spawns.some((s) => s.startsWith("npm install"))).toBe(false);
    expect(out.join("\n")).toContain("지원하는 프로그램");
  });

  it("does not offer when non-interactive", async () => {
    const spawns: string[] = [];
    const { io } = createTempIo({
      home,
      overrides: {
        isInteractive: () => false,
        async spawn(command: string, args: string[]) {
          spawns.push(`${command} ${args.join(" ")}`);
          return { code: 1 };
        },
      },
    });

    const code = await runInstall(OPTS, io);
    expect(code).toBe(1);
    expect(spawns.some((s) => s.startsWith("npm install"))).toBe(false);
  });

  it("a failed npm install falls back to the supported-apps list", async () => {
    const { io, out } = createTempIo({
      home,
      overrides: {
        isInteractive: () => true,
        async prompt() {
          return "2"; // pick Gemini CLI
        },
        async spawn() {
          return { code: 1 }; // everything fails, including npm install
        },
      },
    });

    const code = await runInstall(OPTS, io);
    expect(code).toBe(1);
    expect(out.join("\n")).toContain("설치가 실패했어요");
    expect(out.join("\n")).toContain("지원하는 프로그램");
  });
});

/**
 * This host's config path differs per platform, so treating it as
 * home-relative everywhere leaves it undetected on Windows while the snippet
 * names a path that does not exist.
 *
 * Only the path calculation is checked, with no filesystem: Windows paths use
 * backslashes, so a real run on Linux would pass by finding nothing.
 */
describe("Zed config path is platform-specific", () => {
  const zed = SNIPPET_HOSTS.find((h) => h.id === "zed");

  const io = (platform: string, env: Record<string, string> = {}) => ({
    platform,
    homedir: () => "/home/u",
    env,
  });

  it("host exists — a renamed id must not silently skip these checks", () => {
    expect(zed).toBeDefined();
  });

  it("uses %APPDATA%\\Zed on Windows, not ~/.config/zed", () => {
    const path = zed!.detectedPath(
      io("win32", { APPDATA: "C:\\Users\\u\\AppData\\Roaming" }),
    );
    expect(path).toBe("C:\\Users\\u\\AppData\\Roaming\\Zed\\settings.json");
    expect(path).not.toContain(".config");
  });

  it("refuses to guess when APPDATA is unset — same guard as VS Code", () => {
    expect(zed!.detectedPath(io("win32"))).toBeNull();
  });

  it("uses ~/.config/zed on macOS (NOT Application Support)", () => {
    const path = zed!.detectedPath(io("darwin"));
    expect(path).toBe("/home/u/.config/zed/settings.json");
    expect(path).not.toContain("Application Support");
  });

  it("honours XDG_CONFIG_HOME on Linux", () => {
    expect(zed!.detectedPath(io("linux", { XDG_CONFIG_HOME: "/x/cfg" }))).toBe(
      "/x/cfg/zed/settings.json",
    );
  });

  it("falls back to ~/.config/zed on Linux without XDG_CONFIG_HOME", () => {
    expect(zed!.detectedPath(io("linux"))).toBe(
      "/home/u/.config/zed/settings.json",
    );
  });

  // XDG is a Linux convention; honouring it on macOS points somewhere the
  // app never looks.
  it("ignores XDG_CONFIG_HOME on macOS", () => {
    expect(zed!.detectedPath(io("darwin", { XDG_CONFIG_HOME: "/x/cfg" }))).toBe(
      "/home/u/.config/zed/settings.json",
    );
  });
});

/**
 * A Windows Store install redirects app-data writes into its package
 * container, so writing to the plain location reports success, leaves a
 * backup, and is never read. The publisher hash is never hardcoded: only a
 * directory found by prefix scan AND confirmed to exist is used.
 */
describe("Claude Desktop on Windows Store (MSIX)", () => {
  const claude = FILE_HOSTS.find((h) => h.id === "claude-desktop");

  it("host exists — a renamed id must not silently skip these checks", () => {
    expect(claude).toBeDefined();
  });

  const fakeIo = (over: {
    packages?: string[];
    existing?: string[];
    localAppData?: string;
  }) => {
    const existing = new Set(over.existing ?? []);
    return {
      platform: "win32",
      homedir: () => "C:\\Users\\u",
      env: {
        APPDATA: "C:\\Users\\u\\AppData\\Roaming",
        ...(over.localAppData === undefined
          ? { LOCALAPPDATA: "C:\\Users\\u\\AppData\\Local" }
          : { LOCALAPPDATA: over.localAppData }),
      } as Record<string, string | undefined>,
      async listDir() {
        return over.packages ?? [];
      },
      async exists(p: string) {
        return existing.has(p);
      },
    };
  };

  const PKG = "Claude_pzs8sxrjxfjjc";
  const ROAMING =
    "C:\\Users\\u\\AppData\\Local\\Packages\\Claude_pzs8sxrjxfjjc\\LocalCache\\Roaming\\Claude";

  it("prefers the package container when it actually exists", async () => {
    const io = fakeIo({ packages: [PKG], existing: [ROAMING] });
    const path = await claude!.resolveConfigPath!(io as never);
    expect(path).toBe(`${ROAMING}\\claude_desktop_config.json`);
  });

  /**
   * No directory means null, even when a name-matching package exists:
   * enumeration only narrows the candidates, and existence decides.
   */
  it("returns null when the container dir is absent (no guessing)", async () => {
    const io = fakeIo({ packages: [PKG], existing: [] });
    expect(await claude!.resolveConfigPath!(io as never)).toBeNull();
  });

  it("ignores unrelated packages", async () => {
    const io = fakeIo({
      packages: [
        "Microsoft.WindowsTerminal_8wekyb3d8bbwe",
        "Spotify_zpdnekdrzrea0",
      ],
      existing: [ROAMING],
    });
    expect(await claude!.resolveConfigPath!(io as never)).toBeNull();
  });

  it("returns null when LOCALAPPDATA is unset", async () => {
    const io = fakeIo({
      packages: [PKG],
      existing: [ROAMING],
      localAppData: "",
    });
    expect(await claude!.resolveConfigPath!(io as never)).toBeNull();
  });

  // A non-Store install has no container and must keep the plain path.
  it("falls back to %APPDATA% for the non-Store install", async () => {
    const io = fakeIo({ packages: [] });
    expect(await claude!.resolveConfigPath!(io as never)).toBeNull();
    expect(claude!.configPath(io as never)).toBe(
      "C:\\Users\\u\\AppData\\Roaming\\Claude\\claude_desktop_config.json",
    );
  });

  it("does nothing on macOS / Linux", async () => {
    for (const platform of ["darwin", "linux"]) {
      const io = {
        ...fakeIo({ packages: [PKG], existing: [ROAMING] }),
        platform,
      };
      expect(await claude!.resolveConfigPath!(io as never)).toBeNull();
    }
  });
});

/**
 * A host path follows one of two conventions: a dot directory under home,
 * identical on every OS, or the OS app-data location, which differs per
 * platform. Pinning both as a table catches a new host placed on the wrong
 * side, which is exactly how a platform-specific path goes undetected.
 */
describe("host path conventions (dotfile vs app-data)", () => {
  const io = (platform: string) => ({
    platform,
    homedir: () => (platform === "win32" ? "C:\\Users\\u" : "/home/u"),
    env:
      platform === "win32"
        ? { APPDATA: "C:\\Users\\u\\AppData\\Roaming" }
        : ({} as Record<string, string | undefined>),
  });

  /** A dot directory under home, the same on every OS. */
  const DOTFILE: Array<[string, string]> = [
    ["cursor", ".cursor"],
    ["windsurf", ".codeium"],
    ["junie", ".junie"],
    ["kiro", ".kiro"],
  ];

  it.each(DOTFILE)("%s stays under the home dotfile on every OS", (id, dot) => {
    const host = FILE_HOSTS.find((h) => h.id === id);
    expect(host).toBeDefined();
    for (const platform of ["win32", "darwin", "linux"]) {
      const p = host!.configPath(io(platform) as never);
      expect(p).toContain(dot);
      // A dot-directory host must never land under app data.
      expect(p).not.toContain("AppData");
      expect(p).not.toContain("Application Support");
    }
  });

  /** The OS app-data location, which must differ per platform. */
  it("app-data hosts resolve differently per OS", () => {
    const claude = FILE_HOSTS.find((h) => h.id === "claude-desktop");
    expect(claude!.configPath(io("win32") as never)).toContain("AppData");
    expect(claude!.configPath(io("darwin") as never)).toContain(
      "Application Support",
    );

    const zed = SNIPPET_HOSTS.find((h) => h.id === "zed");
    expect(zed!.detectedPath(io("win32") as never)).toContain("AppData");
    expect(zed!.detectedPath(io("darwin") as never)).toContain(".config");
  });

  /**
   * An app-data host yielding one path on all three platforms means the
   * branch was forgotten.
   */
  it("no app-data host returns an identical path on every OS", () => {
    const appData = [
      SNIPPET_HOSTS.find((h) => h.id === "zed")!.detectedPath,
      (i: never) =>
        FILE_HOSTS.find((h) => h.id === "claude-desktop")!.configPath(i),
    ];
    for (const resolve of appData) {
      const win = resolve(io("win32") as never);
      const mac = resolve(io("darwin") as never);
      expect(win).not.toBe(mac);
    }
  });
});

/**
 * Pins the path-mapping conventions themselves rather than any one host, so
 * a new host that picks the wrong convention is caught here.
 */
describe("resolveHostPath — the mapping itself", () => {
  const io = (platform: string, env: Record<string, string> = {}) => ({
    platform,
    homedir: () => (platform === "win32" ? "C:\\Users\\u" : "/home/u"),
    env: env as Record<string, string | undefined>,
  });
  const APPDATA = { APPDATA: "C:\\Users\\u\\AppData\\Roaming" };

  it("home — 모든 OS 에서 홈 밑 (Windows 도 %USERPROFILE%)", () => {
    const spec = { kind: "home", segments: [".x", "c.json"] } as const;
    expect(resolveHostPath(io("win32", APPDATA), spec)).toBe(
      "C:\\Users\\u\\.x\\c.json",
    );
    expect(resolveHostPath(io("darwin"), spec)).toBe("/home/u/.x/c.json");
    expect(resolveHostPath(io("linux"), spec)).toBe("/home/u/.x/c.json");
  });

  it("appData — OS 앱 데이터 위치", () => {
    const spec = { kind: "appData", segments: ["X", "c.json"] } as const;
    expect(resolveHostPath(io("win32", APPDATA), spec)).toBe(
      "C:\\Users\\u\\AppData\\Roaming\\X\\c.json",
    );
    expect(resolveHostPath(io("darwin"), spec)).toBe(
      "/home/u/Library/Application Support/X/c.json",
    );
    expect(resolveHostPath(io("linux"), spec)).toBe("/home/u/.config/X/c.json");
  });

  /**
   * The home-config convention differs from the XDG one on Windows alone,
   * and that difference is the whole reason both exist.
   */
  it("homeConfig — Windows 에서도 ~/.config", () => {
    const spec = { kind: "homeConfig", segments: ["x", "c.json"] } as const;
    expect(resolveHostPath(io("win32", APPDATA), spec)).toBe(
      "C:\\Users\\u\\.config\\x\\c.json",
    );
    expect(resolveHostPath(io("linux"), spec)).toBe("/home/u/.config/x/c.json");
  });

  it("xdg 와 homeConfig 는 win32 에서 갈린다", () => {
    const segs = ["x", "c.json"] as const;
    expect(
      resolveHostPath(io("win32", APPDATA), { kind: "xdg", segments: segs }),
    ).toContain("AppData");
    expect(
      resolveHostPath(io("win32", APPDATA), {
        kind: "homeConfig",
        segments: segs,
      }),
    ).not.toContain("AppData");
  });

  it("xdg — macOS 도 ~/.config (Application Support 아님)", () => {
    const spec = { kind: "xdg", segments: ["x", "c.json"] } as const;
    expect(resolveHostPath(io("darwin"), spec)).toBe(
      "/home/u/.config/x/c.json",
    );
    expect(resolveHostPath(io("darwin"), spec)).not.toContain(
      "Application Support",
    );
  });

  // XDG is a Linux convention; on macOS it points where no app looks.
  it("XDG_CONFIG_HOME 은 리눅스에서만 읽는다", () => {
    const spec = { kind: "xdg", segments: ["x"] } as const;
    const env = { XDG_CONFIG_HOME: "/xdg" };
    expect(resolveHostPath(io("linux", env), spec)).toBe("/xdg/x");
    expect(resolveHostPath(io("darwin", env), spec)).toBe("/home/u/.config/x");
  });

  // With no app-data location set, nothing is guessed: a write to the wrong
  // place is a false success.
  it("APPDATA 가 없으면 null (home 규약은 영향 없음)", () => {
    expect(
      resolveHostPath(io("win32"), { kind: "appData", segments: ["X"] }),
    ).toBeNull();
    expect(
      resolveHostPath(io("win32"), { kind: "home", segments: [".x"] }),
    ).toBe("C:\\Users\\u\\.x");
  });

  it("platforms 를 벗어나면 null — 리눅스 Claude Desktop 처럼", () => {
    const spec = {
      kind: "appData",
      segments: ["X"],
      platforms: ["darwin", "win32"],
    } as const;
    expect(resolveHostPath(io("linux"), spec)).toBeNull();
    expect(resolveHostPath(io("darwin"), spec)).not.toBeNull();
  });

  // Some apps differ per platform down to the case of the directory name.
  it("win32Segments 가 대소문자 차이를 담는다", () => {
    const spec = {
      kind: "xdg",
      segments: ["zed", "s.json"],
      win32Segments: ["Zed", "s.json"],
    } as const;
    expect(resolveHostPath(io("win32", APPDATA), spec)).toContain("\\Zed\\");
    expect(resolveHostPath(io("linux"), spec)).toContain("/zed/");
  });
});

/**
 * Only hosts confirmed against vendor documentation are supported. A host
 * whose schema is uncertain would get a wrong snippet, which is worse than no
 * guidance at all.
 */
describe("newly covered hosts", () => {
  const io = (platform: string, env: Record<string, string> = {}) => ({
    platform,
    homedir: () => (platform === "win32" ? "C:\\Users\\u" : "/home/u"),
    env: env as Record<string, string | undefined>,
  });

  describe("GitHub Copilot CLI", () => {
    const host = FILE_HOSTS.find((h) => h.id === "copilot-cli");

    it("is a Tier-2 host with the standard mcpServers key", () => {
      expect(host).toBeDefined();
      expect(host!.configKey).toBe("mcpServers");
      expect(host!.entryKind).toBe("stdio");
    });

    it("defaults to ~/.copilot/mcp-config.json on every OS", () => {
      expect(host!.configPath(io("linux") as never)).toBe(
        "/home/u/.copilot/mcp-config.json",
      );
      expect(host!.configPath(io("win32") as never)).toBe(
        "C:\\Users\\u\\.copilot\\mcp-config.json",
      );
    });

    /**
     * Ignoring the documented home override writes beside the config the
     * user moved, and reports success for it.
     */
    it("honours COPILOT_HOME", () => {
      expect(
        host!.configPath(
          io("linux", { COPILOT_HOME: "/opt/copilot" }) as never,
        ),
      ).toBe("/opt/copilot/mcp-config.json");
    });

    it("ignores an empty COPILOT_HOME", () => {
      expect(host!.configPath(io("linux", { COPILOT_HOME: "" }) as never)).toBe(
        "/home/u/.copilot/mcp-config.json",
      );
    });
  });

  describe("OpenCode", () => {
    const host = SNIPPET_HOSTS.find((h) => h.id === "opencode");

    it("is snippet-only and never bootstrapped", () => {
      expect(host).toBeDefined();
      // The file is the tool's whole config and a sibling dialect may
      // already hold it, so creating ours would leave two.
      expect(host!.bootstrapWhenAbsent).toBeUndefined();
    });

    it("resolves the documented global path", () => {
      expect(host!.detectedPath(io("linux") as never)).toBe(
        "/home/u/.config/opencode/opencode.json",
      );
    });

    /**
     * Home-relative on Windows too. The app-data variant comes from stale
     * documentation, and several tools have made that same mistake.
     */
    it("keeps ~/.config on Windows too (NOT %APPDATA%)", () => {
      const path = host!.detectedPath(
        io("win32", { APPDATA: "C:\\Users\\u\\AppData\\Roaming" }) as never,
      );
      expect(path).toBe("C:\\Users\\u\\.config\\opencode\\opencode.json");
      expect(path).not.toContain("AppData");
    });

    it("honours OPENCODE_CONFIG_DIR", () => {
      expect(
        host!.detectedPath(
          io("linux", { OPENCODE_CONFIG_DIR: "/cfg" }) as never,
        ),
      ).toBe("/cfg/opencode.json");
    });

    /**
     * This host's schema differs from the rest, so the shared builder would
     * emit a silently wrong shape that fails with nothing written down.
     */
    it("emits mcp / type:local / command ARRAY / environment", () => {
      const snippet: unknown = JSON.parse(
        host!.buildSnippet(
          {
            version: "1.2.3",
            token: VALID_TOKEN,
            extensionId: VALID_EXTENSION_ID,
          },
          "linux",
        ),
      );
      const root = snippet as { mcp?: Record<string, Record<string, unknown>> };
      expect(root.mcp).toBeDefined();
      const entry = root.mcp!["datalab"]!;
      expect(entry["type"]).toBe("local");
      expect(Array.isArray(entry["command"])).toBe(true);
      expect((entry["command"] as string[])[0]).toBe("npx");
      // The env map has its own key name on this host.
      expect(entry["environment"]).toBeDefined();
      expect(entry["env"]).toBeUndefined();
      expect(root.mcp!["datalab"]).not.toHaveProperty("args");
    });

    it("does not use the mcpServers shape", () => {
      const text = host!.buildSnippet(
        {
          version: "1.2.3",
          token: VALID_TOKEN,
          extensionId: VALID_EXTENSION_ID,
        },
        "linux",
      );
      expect(text).not.toContain("mcpServers");
    });
  });
});

/**
 * The Store desktop app is detected by package identity, because it
 * installs no CLI and creates its config only on first registration, so both
 * other detection paths can miss an installed app. Never by display name:
 * those are mutable and localised, while identity is not.
 */
describe("ChatGPT desktop (Store) detection by package identity", () => {
  const codex = SNIPPET_HOSTS.find((h) => h.id === "codex-config-only");
  const ctx = { cliDetected: new Set<string>() };

  const io = (packages: string[], platform = "win32") => ({
    platform,
    homedir: () => "C:\\Users\\u",
    env: {
      LOCALAPPDATA: "C:\\Users\\u\\AppData\\Local",
    } as Record<string, string | undefined>,
    async listDir() {
      return packages;
    },
    // The config directory does not exist yet: a fresh install.
    async exists() {
      return false;
    },
  });

  it("host exists", () => {
    expect(codex).toBeDefined();
  });

  it("detects the new ChatGPT app via OpenAI.Codex_*", async () => {
    const found = await codex!.detect(
      io(["OpenAI.Codex_2p2nqsd0c76g0"]) as never,
      ctx,
    );
    expect(found).toBe(true);
  });

  /**
   * The legacy app alone is not detected: it does not use this config, so
   * matching it would show guidance nobody can act on.
   */
  it("ignores unrelated / legacy packages", async () => {
    const found = await codex!.detect(
      io([
        "OpenAI.ChatGPT_abcdefghijklm",
        "Microsoft.WindowsTerminal_8wekyb3d8bbwe",
      ]) as never,
      ctx,
    );
    expect(found).toBe(false);
  });

  it("does not use this signal off Windows", async () => {
    const found = await codex!.detect(
      io(["OpenAI.Codex_2p2nqsd0c76g0"], "darwin") as never,
      ctx,
    );
    expect(found).toBe(false);
  });

  // With the CLI present, the CLI host owns this app and we must not write
  // its config ourselves.
  it("stays out of the way when the Codex CLI is present", async () => {
    const found = await codex!.detect(
      io(["OpenAI.Codex_2p2nqsd0c76g0"]) as never,
      {
        cliDetected: new Set(["codex"]),
      },
    );
    expect(found).toBe(false);
  });
});

/**
 * Every vendor-defined home override is honoured. Missing one writes to the
 * wrong place and reports success. These matter under WSL, where the Linux
 * home would otherwise point at a different file from the Windows app's.
 */
describe("vendor-defined home overrides", () => {
  const io = (env: Record<string, string>) => ({
    platform: "linux",
    homedir: () => "/home/u",
    env: env as Record<string, string | undefined>,
  });

  it("CODEX_HOME", () => {
    const codex = SNIPPET_HOSTS.find((h) => h.id === "codex-config-only");
    expect(
      codex!.detectedPath(io({ CODEX_HOME: "/win/.codex" }) as never),
    ).toBe("/win/.codex/config.toml");
    expect(codex!.detectedPath(io({}) as never)).toBe(
      "/home/u/.codex/config.toml",
    );
  });

  it("COPILOT_HOME", () => {
    const copilot = FILE_HOSTS.find((h) => h.id === "copilot-cli");
    expect(copilot!.configPath(io({ COPILOT_HOME: "/c" }) as never)).toBe(
      "/c/mcp-config.json",
    );
  });

  it("OPENCODE_CONFIG_DIR", () => {
    const oc = SNIPPET_HOSTS.find((h) => h.id === "opencode");
    expect(oc!.detectedPath(io({ OPENCODE_CONFIG_DIR: "/o" }) as never)).toBe(
      "/o/opencode.json",
    );
  });

  // An empty value counts as unset; shells export empty variables routinely.
  it.each([
    ["CODEX_HOME", "codex-config-only"],
    ["OPENCODE_CONFIG_DIR", "opencode"],
  ])("empty %s falls back to the default", (key, id) => {
    const host = SNIPPET_HOSTS.find((h) => h.id === id);
    expect(host!.detectedPath(io({ [key]: "" }) as never)).toContain(
      "/home/u/",
    );
  });
});
