/**
 * @modootoday/extension-app-mcp-installer — host installer for the datalab
 * extension connector.
 *
 * One `npx ... install` run: scan installed MCP hosts, register the connector
 * the way each host expects (vendor CLI > verified strict-JSON file > printed
 * snippet), and finish with the restart notice. `uninstall` is symmetric.
 * Zero runtime dependencies; every syscall goes through the injected `Io`.
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
