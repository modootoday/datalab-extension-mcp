/**
 * Host installer for the extension connector.
 *
 * One run scans for installed MCP hosts, registers the connector the way each
 * expects — vendor CLI, then verified strict-JSON file, then printed snippet —
 * and closes with the restart notice. Uninstall is symmetric. Zero runtime
 * dependencies; every syscall goes through the injected I/O seam.
 */

export const PACKAGE_NAME = "@modootoday/extension-app-mcp-installer";

export {
  runInstall,
  runUninstall,
  detectHosts,
  type DetectedHost,
} from "./run.js";

export {
  CLI_HOSTS,
  FILE_HOSTS,
  SNIPPET_HOSTS,
  SUPPORTED_APPS,
  INSTALLABLE_CLIS,
  type InstallableCli,
  SERVER_NAME,
  SERVER_PACKAGE,
  DEFAULT_PORT,
  CODEX_CHATGPT_NOTE,
  buildEnv,
  buildFileEntry,
  packageSpec,
  type CliHost,
  type FileHost,
  type SnippetHost,
  type SnippetContext,
  type FileServerEntry,
  type ServerEntryOptions,
} from "./hosts.js";

export {
  listSkills,
  skillStatus,
  attachSkill,
  detachSkill,
  type SkillSummary,
  type SkillDirState,
  type SkillStatus,
  type MoveOutcome,
  type MoveResult,
} from "./skills-report.js";

export { skillsPayloadRoot } from "./run-skills.js";

export {
  upsertServerKey,
  removeServerKey,
  formatBackupTimestamp,
  BACKUP_KEEP,
  type WriteOutcome,
  type WriteRefusal,
} from "./write-json.js";

export {
  validateInstallOptions,
  validateUninstallOptions,
  TOKEN_RE,
  EXTENSION_ID_RE,
  PORT_RE,
  VERSION_RE,
  INVALID_TOKEN_MESSAGE,
  INVALID_EXTENSION_ID_MESSAGE,
  INVALID_PORT_MESSAGE,
  INVALID_VERSION_MESSAGE,
} from "./validate.js";

export {
  // The paste prompt is shared, not copied. `browsers` asks for the same
  // token in the same words, and two wordings for one act would send a person
  // looking for two different buttons.
  TOKEN_PROMPT_GUIDE,
  TOKEN_PROMPT_QUESTION,
  TOKEN_REQUIRED_NON_INTERACTIVE,
  RESTART_NOTICE,
  NOTHING_CHANGED,
  UNINSTALL_DONE,
  UNINSTALL_TOKEN_REMINDER,
  PERMISSION_DENIED_HINT,
  NO_HOSTS_DETECTED,
  installQuestion,
  uninstallQuestion,
} from "./strings.js";

export { printBanner, INSTALL_SUBTITLE, UNINSTALL_SUBTITLE } from "./banner.js";

export { createNodeIo } from "./io.js";

export type {
  Io,
  SpawnResult,
  RunOptions,
  HostResult,
  HostStatus,
} from "./types.js";
