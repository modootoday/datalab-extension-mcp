import { envPairs, packageSpec, SERVER_NAME } from "./entries.js";
import type { CliHost, InstallableCli, SkillPlacement } from "./types.js";
import { agentsSkillsDir } from "./skills-dir.js";

export const geminiCliHost: CliHost = {
  id: "gemini",
  tier: 1,
  displayName: "Gemini CLI",
  bin: "gemini",
  // User scope, for the same cwd-binding reason as the Claude Code host.
  buildAddArgs(opts) {
    const args = ["mcp", "add", "-s", "user"];
    for (const pair of envPairs(opts)) {
      args.push("-e", pair);
    }
    args.push(SERVER_NAME, "npx", "-y", packageSpec(opts.version));
    return args;
  },
  buildRemoveArgs() {
    return ["mcp", "remove", "-s", "user", SERVER_NAME];
  },
};

export const geminiInstallable: InstallableCli = {
  id: "gemini",
  displayName: "Gemini CLI",
  npmPackage: "@google/gemini-cli",
};

export const geminiSkills: SkillPlacement = {
  tier: 2,
  skillsDir(io) {
    return agentsSkillsDir(io);
  },
};
