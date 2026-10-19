import type { FileHost, SkillPlacement } from "./types.js";
import { resolveHostPath } from "./paths.js";

export const junieFileHost: FileHost = {
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
};

export const junieSkills: SkillPlacement = {
  tier: 2,
  skillsDir(io) {
    return resolveHostPath(io, {
      kind: "home",
      segments: [".junie", "skills"],
    });
  },
};
