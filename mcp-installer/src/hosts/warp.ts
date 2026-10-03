import type { SkillPlacement, SnippetHost } from "./types.js";
import { resolveHostPath, type HostPathSpec } from "./paths.js";
import { agentsSkillsDir } from "./skills-dir.js";
import { fileOrParentExists, jsonSnippet } from "./snippets.js";

const WARP_PATH: HostPathSpec = {
  kind: "home",
  segments: [".warp", ".mcp.json"],
};

export const warpSnippetHost: SnippetHost = {
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
};

export const warpSkills: SkillPlacement = {
  tier: 2,
  skillsDir(io) {
    return agentsSkillsDir(io);
  },
};
