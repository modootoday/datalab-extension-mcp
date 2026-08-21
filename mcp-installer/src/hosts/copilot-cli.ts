import type { FileHost, SkillPlacement } from "./types.js";
import { joinPath, resolveHostPath } from "./paths.js";
import { agentsSkillsDir } from "./skills-dir.js";

export const copilotCliFileHost: FileHost = {
  // A home override env var wins when set. Ignoring it would write beside
  // the config the user moved, reporting success the app never sees.
  id: "copilot-cli",
  tier: 2,
  displayName: "GitHub Copilot CLI",
  configKey: "mcpServers",
  entryKind: "stdio",
  configPath(io) {
    const home = io.env["COPILOT_HOME"];
    if (home !== undefined && home !== "") {
      return joinPath(io, home, "mcp-config.json");
    }
    return resolveHostPath(io, {
      kind: "home",
      segments: [".copilot", "mcp-config.json"],
    });
  },
};

export const copilotCliSkills: SkillPlacement = {
  tier: 2,
  skillsDir(io) {
    return agentsSkillsDir(io);
  },
};
