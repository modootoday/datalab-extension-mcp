import type { SkillPlacement, SnippetHost } from "./types.js";
import { joinPath, resolveHostPath, type PathIo } from "./paths.js";
import { agentsSkillsDir } from "./skills-dir.js";
import { fileOrParentExists, jsonSnippet } from "./snippets.js";

/**
 * The editor's per-user data directory. Only the stable variant is resolved;
 * the rebranded ones have directory names we would only be guessing at, and
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

export const vscodeSnippetHost: SnippetHost = {
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
  pasteWhere: '아래 내용을 설정 파일의 "servers" 항목에 직접 붙여넣어 주세요.',
  // The hint names the profile too: a non-default profile keeps its own
  // config elsewhere, so pasting into the path above would not reach it.
  createHint:
    "파일이 없으면 VS Code 에서 명령 팔레트(Ctrl+Shift+P) → 'MCP: Open User Configuration' 을 실행하면 만들어져요. 기본 프로필이 아니면 그 프로필의 mcp.json 이 User/profiles 아래에 따로 있으니, 그 명령으로 열린 파일에 붙여넣어 주세요.",
  bootstrapWhenAbsent: true,
  buildSnippet(opts, platform) {
    return jsonSnippet("servers", opts, platform);
  },
};

export const vscodeSkills: SkillPlacement = {
  tier: 2,
  skillsDir(io) {
    return agentsSkillsDir(io);
  },
};
