import type { SkillPlacement, SnippetHost } from "./types.js";
import { resolveHostPath, type PathIo } from "./paths.js";
import { agentsSkillsDir } from "./skills-dir.js";
import { fileOrParentExists, jsonSnippet } from "./snippets.js";

/**
 * This host's config path differs per platform, including the casing of the
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

export const zedSnippetHost: SnippetHost = {
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
};

export const zedSkills: SkillPlacement = {
  tier: 2,
  skillsDir(io) {
    return agentsSkillsDir(io);
  },
};
