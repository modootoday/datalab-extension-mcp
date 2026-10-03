import { envPairs, packageSpec, SERVER_NAME } from "./entries.js";
import { resolveHostPath } from "./paths.js";
import type { CliHost, InstallableCli, SkillPlacement } from "./types.js";

export const claudeCliHost: CliHost = {
  id: "claude",
  tier: 1,
  displayName: "Claude Code",
  bin: "claude",
  // User scope is mandatory: the default local scope binds the server to
  // whatever directory the command was pasted in, which reads as success and
  // then does nothing everywhere else.
  buildAddArgs(opts) {
    const args = ["mcp", "add", SERVER_NAME, "--scope", "user"];
    for (const pair of envPairs(opts)) {
      args.push("--env", pair);
    }
    args.push("--", "npx", "-y", packageSpec(opts.version));
    return args;
  },
  buildRemoveArgs() {
    return ["mcp", "remove", SERVER_NAME, "--scope", "user"];
  },
};

export const claudeInstallable: InstallableCli = {
  id: "claude",
  displayName: "Claude Code",
  npmPackage: "@anthropic-ai/claude-code",
};

export const claudeSkills: SkillPlacement = {
  tier: 2,
  skillsDir(io) {
    return resolveHostPath(io, {
      kind: "home",
      segments: [".claude", "skills"],
    });
  },
};
