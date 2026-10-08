import type { SkillPlacement, SnippetHost } from "./types.js";
import { resolveHostPath, type HostPathSpec } from "./paths.js";
import { fileOrParentExists, jsonSnippet } from "./snippets.js";

/** One path definition per host, so detect and detectedPath cannot diverge. */
const LMSTUDIO_PATH: HostPathSpec = {
  kind: "home",
  segments: [".lmstudio", "mcp.json"],
};

export const lmstudioSnippetHost: SnippetHost = {
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
};

export const lmstudioSkills: SkillPlacement = {
  tier: 3,
  reason: "LM Studio 는 스킬(SKILL.md) 개념이 없어요.",
  instruction: "MCP 서버 연결만 지원돼요.",
};
