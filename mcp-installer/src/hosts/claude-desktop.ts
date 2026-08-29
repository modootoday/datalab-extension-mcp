import type { FileHost, SkillPlacement, SnippetHost } from "./types.js";
import { joinPath, resolveHostPath } from "./paths.js";
import { jsonSnippet } from "./snippets.js";
import { msixRoamingDir } from "./win32.js";

export const claudeDesktopFileHost: FileHost = {
  id: "claude-desktop",
  tier: 2,
  displayName: "Claude Desktop",
  configKey: "mcpServers",
  entryKind: "stdio",
  // Linux has no documented path, so a snippet host covers it; guessing
  // one here would manufacture a false success.
  configPath(io) {
    return resolveHostPath(io, {
      kind: "appData",
      segments: ["Claude", "claude_desktop_config.json"],
      platforms: ["darwin", "win32"],
    });
  },
  /**
   * A Store install writes inside its package container instead. The two
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
};

export const claudeDesktopLinuxSnippetHost: SnippetHost = {
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
  // Guessing a path here would manufacture a false success that only
  // surfaces after a restart.
  reason: "리눅스용 공식 설정 파일 경로가 확인되지 않아 자동 수정하지 않아요.",
  pasteWhere:
    "Claude Desktop 공식 문서가 안내하는 설정 파일(claude_desktop_config.json)에 아래 내용을 직접 붙여넣어 주세요.",
  buildSnippet(opts, platform) {
    return jsonSnippet("mcpServers", opts, platform);
  },
};

/**
 * The desktop app's Code tab reads Claude Code's own directory, so the
 * placement is that directory and not a second one beside the config file.
 */
export const claudeDesktopSkills: SkillPlacement = {
  tier: 2,
  skillsDir(io) {
    return resolveHostPath(io, {
      kind: "home",
      segments: [".claude", "skills"],
    });
  },
};

export const claudeDesktopLinuxSkills: SkillPlacement = {
  tier: 3,
  reason:
    "리눅스용 Claude 데스크톱의 스킬 경로가 공식 문서로 확인되지 않았어요.",
  instruction: "확인되면 자동 설치 대상에 넣을게요.",
};
