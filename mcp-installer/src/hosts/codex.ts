import { envPairs, packageSpec, SERVER_NAME } from "./entries.js";
import type {
  CliHost,
  InstallableCli,
  SkillPlacement,
  SnippetHost,
} from "./types.js";
import { agentsSkillsDir } from "./skills-dir.js";
import {
  joinPath,
  resolveHostPath,
  type HostPathSpec,
  type PathIo,
} from "./paths.js";
import { fileOrParentExists, tomlSnippet } from "./snippets.js";
import { msixPackageInstalled } from "./win32.js";

export const CODEX_CHATGPT_NOTE = "ChatGPT 데스크톱과 함께 연결돼요.";

export const codexCliHost: CliHost = {
  id: "codex",
  tier: 1,
  displayName: "ChatGPT 데스크톱 / Codex",
  bin: "codex",
  // The CLI and the desktop app share one config, so a single registration
  // covers both — worth saying out loud in the output.
  note: CODEX_CHATGPT_NOTE,
  buildAddArgs(opts) {
    const args = ["mcp", "add", SERVER_NAME];
    for (const pair of envPairs(opts)) {
      args.push("--env", pair);
    }
    args.push("--", "npx", "-y", packageSpec(opts.version));
    return args;
  },
  buildRemoveArgs() {
    return ["mcp", "remove", SERVER_NAME];
  },
};

export const codexInstallable: InstallableCli = {
  id: "codex",
  displayName: "ChatGPT 데스크톱 / Codex",
  npmPackage: "@openai/codex",
};

const CODEX_PATH: HostPathSpec = {
  kind: "home",
  segments: [".codex", "config.toml"],
};

/**
 * Not subject to Store package virtualisation: the redirect covers app data
 * and the registry, not the user-profile path this config lives under. The
 * vendor also documents its apps sharing one config, which virtualisation
 * would break. The home override matters under WSL, where the Linux home
 * would otherwise point at a different file from the Windows app's.
 */
function codexConfigPath(io: PathIo): string | null {
  const home = io.env["CODEX_HOME"];
  if (home !== undefined && home !== "") {
    return joinPath(io, home, "config.toml");
  }
  return resolveHostPath(io, CODEX_PATH);
}

/**
 * The package identity of the current Store desktop app, which does not
 * match its display name. The legacy app under the older name does not use
 * this config, and matching it too would show guidance nobody can act on.
 */
const CHATGPT_DESKTOP_PACKAGE = "OpenAI.Codex_";

export const codexConfigOnlySnippetHost: SnippetHost = {
  id: "codex-config-only",
  tier: 3,
  displayName: "ChatGPT 데스크톱 / Codex (설정 파일만 발견)",
  async detect(io, ctx) {
    // Only when the CLI itself is absent — with it present, the CLI host
    // owns this app and writing the config ourselves is forbidden.
    if (ctx.cliDetected.has("codex")) {
      return false;
    }
    // File-or-parent, like every other snippet host: the desktop app does
    // not install the CLI and does not create its config until a server is
    // first registered, so requiring the file would miss an installed app.
    if (await fileOrParentExists(io, codexConfigPath(io))) {
      return true;
    }
    // A Store install may have neither yet, so package identity is what
    // proves the app is there and lets us offer to create the file.
    return msixPackageInstalled(io, CHATGPT_DESKTOP_PACKAGE);
  },
  detectedPath(io) {
    return codexConfigPath(io);
  },
  // Our own table in this file; set means the config is merged, not printed.
  tomlServerName: SERVER_NAME,
  reason:
    "설정 파일의 형태를 알아보지 못해 자동으로 고치지 않았어요. 아래 내용을 직접 넣어 주세요.",
  pasteWhere: "아래 내용을 위 설정 파일에 직접 붙여넣어 주세요.",
  // The desktop app, the CLI, and the IDE extension share this one file.
  createHint:
    "파일이 없으면 ChatGPT 데스크톱에서 설정 → MCP 서버 → 서버 추가를 한 번 하면 만들어져요. 폴더가 없으면 직접 만들어도 돼요.",
  bootstrapWhenAbsent: true,
  buildSnippet(opts) {
    return tomlSnippet(opts);
  },
};

export const codexSkills: SkillPlacement = {
  tier: 2,
  skillsDir(io) {
    return agentsSkillsDir(io);
  },
};

/**
 * A refusal about detection, not about Codex: with the CLI present the
 * codex descriptor's own placement already covers this vendor's skills.
 */
export const codexConfigOnlySkills: SkillPlacement = {
  tier: 3,
  reason: "Codex CLI 를 찾지 못해 스킬 위치를 확인할 수 없어요.",
  instruction: "Codex 를 설치한 뒤 다시 실행해 주세요.",
};
