import type { SkillPlacement, SnippetHost } from "./types.js";
import { resolveHostPath, type HostPathSpec } from "./paths.js";
import { fileOrParentExists, jsonSnippet } from "./snippets.js";

/** The only path the vendor documentation states. */
const CLINE_PATH: HostPathSpec = {
  kind: "home",
  segments: [".cline", "mcp.json"],
};

export const clineSnippetHost: SnippetHost = {
  // One documented path only. An unverified path from a third-party table
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
};

export const clineSkills: SkillPlacement = {
  tier: 2,
  skillsDir(io) {
    return resolveHostPath(io, {
      kind: "home",
      segments: [".cline", "skills"],
    });
  },
};
