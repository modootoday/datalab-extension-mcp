import type { FileHost, SkillPlacement } from "./types.js";
import { resolveHostPath } from "./paths.js";

export const kiroFileHost: FileHost = {
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
};

export const kiroSkills: SkillPlacement = {
  tier: 2,
  skillsDir(io) {
    return resolveHostPath(io, { kind: "home", segments: [".kiro", "skills"] });
  },
};
