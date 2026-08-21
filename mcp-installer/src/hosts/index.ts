/**
 * The host table — hardcoded on purpose, since the installer is re-downloaded
 * on every run.  A remotely fetched table would make this a remote-controlled
 * home-directory writer.
 *
 * Three tiers, in decreasing trust of our own writes: spawn the vendor CLI;
 * write the file, but only for configs verified as strict JSON; or print a
 * snippet and never write. A confident refusal beats a false success.
 */
import {
  buildFileEntry,
  buildUrlEntry,
  type FileServerEntry,
  type ServerEntryOptions,
} from "./entries.js";
import type {
  CliHost,
  FileHost,
  HostDescriptor,
  InstallableCli,
  SnippetHost,
} from "./types.js";

export type {
  CliHost,
  FileHost,
  HostDescriptor,
  InstallableCli,
  SkillPlacement,
  SnippetContext,
  SnippetHost,
} from "./types.js";

import { claudeCliHost, claudeInstallable, claudeSkills } from "./claude.js";
import {
  claudeDesktopFileHost,
  claudeDesktopLinuxSkills,
  claudeDesktopLinuxSnippetHost,
  claudeDesktopSkills,
} from "./claude-desktop.js";
import { clineSkills, clineSnippetHost } from "./cline.js";
import {
  CODEX_CHATGPT_NOTE,
  codexCliHost,
  codexConfigOnlySkills,
  codexConfigOnlySnippetHost,
  codexInstallable,
  codexSkills,
} from "./codex.js";
import { copilotCliFileHost, copilotCliSkills } from "./copilot-cli.js";
import { cursorFileHost, cursorSkills } from "./cursor.js";
import { geminiCliHost, geminiInstallable, geminiSkills } from "./gemini.js";
import { junieFileHost, junieSkills } from "./junie.js";
import { kiroFileHost, kiroSkills } from "./kiro.js";
import { lmstudioSkills, lmstudioSnippetHost } from "./lmstudio.js";
import { opencodeSkills, opencodeSnippetHost } from "./opencode.js";
import { vscodeSkills, vscodeSnippetHost } from "./vscode.js";
import { warpSkills, warpSnippetHost } from "./warp.js";
import { windsurfFileHost, windsurfSkills } from "./windsurf.js";
import { zedSkills, zedSnippetHost } from "./zed.js";

export { CODEX_CHATGPT_NOTE };

// ---------------------------------------------------------------------------
// Tier 1 — official CLIs
// ---------------------------------------------------------------------------

export const CLI_HOSTS: CliHost[] = [
  claudeCliHost,
  codexCliHost,
  geminiCliHost,
];

// ---------------------------------------------------------------------------
// Offer-to-install CLIs (only when NOTHING is detected)
// ---------------------------------------------------------------------------

export const INSTALLABLE_CLIS: InstallableCli[] = [
  claudeInstallable,
  geminiInstallable,
  codexInstallable,
];

// ---------------------------------------------------------------------------
// Tier 2 — verified strict-JSON files
// ---------------------------------------------------------------------------

export const FILE_HOSTS: FileHost[] = [
  claudeDesktopFileHost,
  cursorFileHost,
  windsurfFileHost,
  copilotCliFileHost,
  junieFileHost,
  kiroFileHost,
];

/** The config entry a Tier-2 host receives, chosen by its entryKind. */
export function buildEntryForHost(
  host: FileHost,
  opts: ServerEntryOptions,
  platform: string,
): FileServerEntry {
  if (host.entryKind === "url") {
    return buildUrlEntry(opts);
  }
  return buildFileEntry(opts, platform);
}

// ---------------------------------------------------------------------------
// Tier 3 — detect + snippet, never write
// ---------------------------------------------------------------------------

export const SNIPPET_HOSTS: SnippetHost[] = [
  vscodeSnippetHost,
  opencodeSnippetHost,
  zedSnippetHost,
  clineSnippetHost,
  lmstudioSnippetHost,
  warpSnippetHost,
  claudeDesktopLinuxSnippetHost,
  codexConfigOnlySnippetHost,
];

// ---------------------------------------------------------------------------
// Skills — two tiers, one row per vendor
// ---------------------------------------------------------------------------

/**
 * Ids and names are read off the MCP descriptors rather than retyped, so a
 * rename cannot leave the two surfaces disagreeing about the same vendor.
 */
export const SKILL_HOSTS: ReadonlyArray<HostDescriptor> = [
  {
    id: claudeCliHost.id,
    displayName: claudeCliHost.displayName,
    skills: claudeSkills,
  },
  {
    id: codexCliHost.id,
    displayName: codexCliHost.displayName,
    skills: codexSkills,
  },
  {
    id: geminiCliHost.id,
    displayName: geminiCliHost.displayName,
    skills: geminiSkills,
  },
  {
    id: claudeDesktopFileHost.id,
    displayName: claudeDesktopFileHost.displayName,
    skills: claudeDesktopSkills,
  },
  {
    id: cursorFileHost.id,
    displayName: cursorFileHost.displayName,
    skills: cursorSkills,
  },
  {
    id: windsurfFileHost.id,
    displayName: windsurfFileHost.displayName,
    skills: windsurfSkills,
  },
  {
    id: copilotCliFileHost.id,
    displayName: copilotCliFileHost.displayName,
    skills: copilotCliSkills,
  },
  {
    id: junieFileHost.id,
    displayName: junieFileHost.displayName,
    skills: junieSkills,
  },
  {
    id: kiroFileHost.id,
    displayName: kiroFileHost.displayName,
    skills: kiroSkills,
  },
  {
    id: vscodeSnippetHost.id,
    displayName: vscodeSnippetHost.displayName,
    skills: vscodeSkills,
  },
  {
    id: opencodeSnippetHost.id,
    displayName: opencodeSnippetHost.displayName,
    skills: opencodeSkills,
  },
  {
    id: zedSnippetHost.id,
    displayName: zedSnippetHost.displayName,
    skills: zedSkills,
  },
  {
    id: clineSnippetHost.id,
    displayName: clineSnippetHost.displayName,
    skills: clineSkills,
  },
  {
    id: lmstudioSnippetHost.id,
    displayName: lmstudioSnippetHost.displayName,
    skills: lmstudioSkills,
  },
  {
    id: warpSnippetHost.id,
    displayName: warpSnippetHost.displayName,
    skills: warpSkills,
  },
  {
    id: claudeDesktopLinuxSnippetHost.id,
    displayName: claudeDesktopLinuxSnippetHost.displayName,
    skills: claudeDesktopLinuxSkills,
  },
  {
    id: codexConfigOnlySnippetHost.id,
    displayName: codexConfigOnlySnippetHost.displayName,
    skills: codexConfigOnlySkills,
  },
];

/** Shown when nothing was detected — the user needs somewhere to go next. */
export const SUPPORTED_APPS: Array<{ name: string; url: string }> = [
  { name: "Claude Desktop", url: "https://claude.ai/download" },
  { name: "Claude Code", url: "https://claude.com/claude-code" },
  { name: "ChatGPT 데스크톱", url: "https://openai.com/chatgpt/download/" },
  { name: "Codex CLI", url: "https://developers.openai.com/codex/" },
  { name: "Gemini CLI", url: "https://github.com/google-gemini/gemini-cli" },
  { name: "Cursor", url: "https://cursor.com/downloads" },
  { name: "Windsurf", url: "https://windsurf.com/download" },
  { name: "JetBrains Junie", url: "https://www.jetbrains.com/junie/" },
  { name: "Kiro", url: "https://kiro.dev/" },
  { name: "GitHub Copilot CLI", url: "https://github.com/github/copilot-cli" },
  { name: "OpenCode", url: "https://opencode.ai/" },
  { name: "VS Code", url: "https://code.visualstudio.com/" },
  { name: "Zed", url: "https://zed.dev/download" },
  { name: "Cline", url: "https://cline.bot/" },
  { name: "LM Studio", url: "https://lmstudio.ai/" },
  { name: "Warp", url: "https://www.warp.dev/" },
];
