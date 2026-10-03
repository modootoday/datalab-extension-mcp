import type { FileHost, SkillPlacement } from "./types.js";
import { joinPath } from "./paths.js";
import { agentsSkillsDir } from "./skills-dir.js";

export const windsurfFileHost: FileHost = {
  // Documented strict JSON, so a single-key merge is safe. The hygiene floor
  // still refuses and falls back to a snippet if an install turns out to
  // carry comments.
  id: "windsurf",
  tier: 2,
  displayName: "Windsurf",
  configKey: "mcpServers",
  entryKind: "stdio",
  configPath(io) {
    return joinPath(
      io,
      io.homedir(),
      ".codeium",
      "windsurf",
      "mcp_config.json",
    );
  },
};

export const windsurfSkills: SkillPlacement = {
  tier: 2,
  skillsDir(io) {
    return agentsSkillsDir(io);
  },
};
