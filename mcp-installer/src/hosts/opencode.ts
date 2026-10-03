import {
  buildEnv,
  packageSpec,
  SERVER_NAME,
  type ServerEntryOptions,
} from "./entries.js";
import type { SkillPlacement, SnippetHost } from "./types.js";
import {
  joinPath,
  resolveHostPath,
  type HostPathSpec,
  type PathIo,
} from "./paths.js";
import { fileOrParentExists } from "./snippets.js";
import { agentsSkillsDir } from "./skills-dir.js";

/**
 * Home-relative on every OS, Windows included — the app-data variant comes
 * from stale documentation and several tools have made that mistake. An
 * explicit config-directory env var overrides it.
 */
const OPENCODE_PATH: HostPathSpec = {
  kind: "homeConfig",
  segments: ["opencode", "opencode.json"],
};

/** The config-directory override when set, otherwise the documented path. */
function opencodeConfigPath(io: PathIo): string | null {
  const dir = io.env["OPENCODE_CONFIG_DIR"];
  if (dir !== undefined && dir !== "") {
    return joinPath(io, dir, "opencode.json");
  }
  return resolveHostPath(io, OPENCODE_PATH);
}

/**
 * This host uses a different schema — its own top-level key, a type
 * discriminator, a single command array, and a differently named env map — so
 * the shared entry builder would emit a silently wrong shape that fails with
 * nothing written down anywhere.
 */
function opencodeSnippet(opts: ServerEntryOptions): string {
  return JSON.stringify(
    {
      mcp: {
        [SERVER_NAME]: {
          type: "local",
          command: ["npx", "-y", packageSpec(opts.version)],
          enabled: true,
          environment: buildEnv(opts),
        },
      },
    },
    null,
    2,
  );
}

export const opencodeSnippetHost: SnippetHost = {
  id: "opencode",
  tier: 3,
  displayName: "OpenCode",
  async detect(io) {
    return fileOrParentExists(io, opencodeConfigPath(io));
  },
  detectedPath(io) {
    return opencodeConfigPath(io);
  },
  reason: "도구 전체 설정 파일이라 자동 수정하지 않아요.",
  pasteWhere: '아래 내용을 설정 파일의 "mcp" 항목에 직접 붙여넣어 주세요.',
  // Never created for this host: the file is the tool's whole config and a
  // sibling dialect may already hold it, so creating ours would leave two
  // config files with no way for the user to know which wins.
  createHint:
    "설정 파일은 opencode.json 또는 opencode.jsonc 예요. 쓰고 있는 쪽에 붙여넣어 주세요.",
  buildSnippet(opts) {
    return opencodeSnippet(opts);
  },
};

export const opencodeSkills: SkillPlacement = {
  tier: 2,
  skillsDir(io) {
    return agentsSkillsDir(io);
  },
};
