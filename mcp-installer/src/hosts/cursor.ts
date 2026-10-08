import type { FileHost, SkillPlacement } from "./types.js";
import { resolveHostPath } from "./paths.js";
import { agentsSkillsDir } from "./skills-dir.js";

export const cursorFileHost: FileHost = {
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
};

export const cursorSkills: SkillPlacement = {
  tier: 2,
  skillsDir(io) {
    return agentsSkillsDir(io);
  },
};
