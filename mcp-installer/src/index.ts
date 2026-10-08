/**
 * Host installer for the extension connector.
 *
 * One run scans for installed MCP hosts, registers the connector the way each
 * expects — vendor CLI, then verified strict-JSON file, then printed snippet —
 * and closes with the restart notice. Uninstall is symmetric. Zero runtime
 * dependencies; every syscall goes through the injected I/O seam.
 */

export const PACKAGE_NAME = "@modootoday/datalab-extension-app-mcp-installer";

export {
  runInstall,
  runUninstall,
  detectHosts,
  cleanupLegacySkills,
  type DetectedHost,
  type LegacyCleanup,
} from "./run.js";

export {
  installGlobally,
  resolveGlobalLaunch,
  uninstallGlobally,
  type GlobalInstallOutcome,
} from "./global-install.js";

export { relinkInstalledHosts } from "./relink.js";

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
  CATALOG_SERVER_NAME,
  CATALOG_URL,
} from "./hosts.js";

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
  TOKEN_REQUIRED,
  NOTHING_CHANGED,
  UNINSTALL_DONE,
  PERMISSION_DENIED_HINT,
  NO_HOSTS_DETECTED,
  INSTALL_QUESTION,
  UNINSTALL_QUESTION,
} from "./strings.js";

export {
  createUi,
  terminalCaps,
  displayWidth,
  type Ui,
  type Status,
  type TerminalCaps,
} from "./ui.js";

export { createNodeIo } from "./io.js";

export type {
  Io,
  SpawnResult,
  RunOptions,
  HostResult,
  HostStatus,
} from "./types.js";
