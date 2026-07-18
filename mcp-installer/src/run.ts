/**
 * The orchestrator — detection, the one Y/n question, per-host application,
 * and the closing copy. All I/O goes through the injected `Io`.
 *
 * Failure isolation is the core invariant here: one host throwing must never
 * stop the others, because the user runs this exactly once and expects a
 * per-host verdict, not a stack trace halfway through.
 */
import { INSTALL_SUBTITLE, UNINSTALL_SUBTITLE, printBanner } from "./banner.js";
import {
  CLI_HOSTS,
  DEFAULT_EXTENSION_ID,
  FILE_HOSTS,
  INSTALLABLE_CLIS,
  SERVER_NAME,
  SNIPPET_HOSTS,
  SUPPORTED_APPS,
  buildEntryForHost,
  type CliHost,
  type FileHost,
  type InstallableCli,
  type ServerEntryOptions,
  type SnippetHost,
} from "./hosts.js";
import {
  AFTER_INSTALL_RETRY,
  CLI_OFFER_INTRO,
  CLI_OFFER_QUESTION,
  CLI_OFFER_SKIP_LABEL,
  NOTHING_CHANGED,
  NO_HOSTS_DETECTED,
  PERMISSION_DENIED_HINT,
  RESTART_NOTICE,
  SUPPORTED_APPS_HEADER,
  UNINSTALL_DONE,
  UNINSTALL_TOKEN_REMINDER,
  TOKEN_PROMPT_GUIDE,
  TOKEN_PROMPT_QUESTION,
  TOKEN_PROMPT_RETRY,
  TOKEN_REQUIRED_NON_INTERACTIVE,
  cliInstallFailed,
  cliInstalled,
  cliInstalledRetry,
  cliInstalling,
  installQuestion,
  uninstallQuestion,
} from "./strings.js";
import {
  TOKEN_RE,
  validateInstallOptions,
  validateUninstallOptions,
} from "./validate.js";
import { removeServerKey, upsertServerKey } from "./write-json.js";
import type { HostResult, Io, RunOptions } from "./types.js";

export interface DetectedHost {
  tier: 1 | 2 | 3;
  id: string;
  displayName: string;
  cli?: CliHost;
  file?: FileHost;
  snippet?: SnippetHost;
  /** Resolved config path for Tier-2 hosts. */
  configPath?: string;
}

/**
 * Scans for every known host. Tier-1 CLIs are probed with `--version`; file
 * hosts count as present when the config file OR its parent app directory
 * exists (a fresh app install often has the directory but no config yet).
 */
export async function detectHosts(io: Io): Promise<DetectedHost[]> {
  const detected: DetectedHost[] = [];
  const useShell = io.platform === "win32";
  const cliDetected = new Set<string>();

  for (const host of CLI_HOSTS) {
    let responded = false;
    try {
      const result = await io.spawn(host.bin, ["--version"], {
        shell: useShell,
      });
      responded = result.code === 0;
    } catch {
      responded = false;
    }
    if (responded) {
      cliDetected.add(host.id);
      detected.push({
        tier: 1,
        id: host.id,
        displayName: host.displayName,
        cli: host,
      });
    }
  }

  for (const host of FILE_HOSTS) {
    const configPath = host.configPath(io);
    if (configPath === null) {
      continue;
    }
    let present = await io.exists(configPath);
    if (!present) {
      const cut = Math.max(
        configPath.lastIndexOf("/"),
        configPath.lastIndexOf("\\"),
      );
      if (cut > 0) {
        present = await io.exists(configPath.slice(0, cut));
      }
    }
    if (present) {
      detected.push({
        tier: 2,
        id: host.id,
        displayName: host.displayName,
        file: host,
        configPath,
      });
    }
  }

  for (const host of SNIPPET_HOSTS) {
    let present = false;
    try {
      present = await host.detect(io, { cliDetected });
    } catch {
      present = false;
    }
    if (present) {
      detected.push({
        tier: 3,
        id: host.id,
        displayName: host.displayName,
        snippet: host,
      });
    }
  }

  return detected;
}

function tierLabel(tier: 1 | 2 | 3): string {
  if (tier === 1) {
    return "공식 명령어로 연결해요";
  }
  if (tier === 2) {
    return "설정 파일에 안전하게 추가해요";
  }
  return "직접 붙여넣도록 안내만 해요";
}

function printDetected(io: Io, detected: DetectedHost[]): void {
  io.out("연결할 수 있는 프로그램을 찾았어요:");
  for (const tier of [1, 2, 3] as const) {
    const group = detected.filter((d) => d.tier === tier);
    if (group.length === 0) {
      continue;
    }
    io.out(`  ${tierLabel(tier)}:`);
    for (const d of group) {
      io.out(`    - ${d.displayName}`);
    }
  }
}

function printSupportedApps(io: Io): void {
  io.out(NO_HOSTS_DETECTED);
  io.out(SUPPORTED_APPS_HEADER);
  for (const app of SUPPORTED_APPS) {
    io.out(`  - ${app.name}: ${app.url}`);
  }
  io.out(AFTER_INSTALL_RETRY);
}

/**
 * The zero-detected fork's optional offer: install one of a few Node-based MCP
 * host CLIs right here. Returns the chosen CLI, or null when the user declines
 * or is non-interactive. A machine that reached this line already has Node
 * (it ran `npx`), so these `npm install -g` targets can actually land.
 *
 * The pick is never forced — option 0 (and any non-numbered / out-of-range
 * reply) declines, and the caller falls through to the download list.
 */
async function offerCliInstall(io: Io): Promise<InstallableCli | null> {
  if (!io.isInteractive()) {
    return null;
  }
  io.out(NO_HOSTS_DETECTED);
  io.out("");
  io.out(CLI_OFFER_INTRO);
  INSTALLABLE_CLIS.forEach((cli, i) => {
    io.out(`  ${i + 1}. ${cli.displayName}`);
  });
  io.out(`  ${CLI_OFFER_SKIP_LABEL}`);
  const answer = await io.prompt(
    `${CLI_OFFER_QUESTION} (0-${INSTALLABLE_CLIS.length}):`,
  );
  const n = Number(answer.trim());
  if (!Number.isInteger(n) || n < 1 || n > INSTALLABLE_CLIS.length) {
    return null;
  }
  return INSTALLABLE_CLIS[n - 1] ?? null;
}

/** `npm install -g` the chosen CLI, streaming npm's own progress. */
async function installCli(io: Io, cli: InstallableCli): Promise<boolean> {
  io.out("");
  io.out(cliInstalling(cli.displayName, cli.npmPackage));
  let code = -1;
  try {
    const result = await io.spawn("npm", ["install", "-g", cli.npmPackage], {
      shell: io.platform === "win32",
      inheritStdio: true,
    });
    code = result.code;
  } catch {
    code = -1;
  }
  if (code === 0) {
    io.out(cliInstalled(cli.displayName));
    return true;
  }
  io.out(cliInstallFailed(cli.displayName));
  return false;
}

function printResult(io: Io, result: HostResult): void {
  let label: string;
  if (result.status === "success") {
    label = "[성공]";
  } else if (result.status === "failed") {
    label = "[실패]";
  } else {
    label = "[건너뜀]";
  }
  let line = `${label} ${result.displayName}`;
  if (result.message !== undefined && result.message !== "") {
    line = `${line} — ${result.message}`;
  }
  io.out(line);
  if (result.backupPath !== undefined) {
    io.out(`        백업: ${result.backupPath}`);
  }
}

function printSnippetBlock(
  io: Io,
  host: SnippetHost,
  opts: ServerEntryOptions,
): void {
  io.out("");
  const path = host.detectedPath(io);
  if (path !== null) {
    io.out(`${host.displayName} — 찾은 위치: ${path}`);
  } else {
    io.out(`${host.displayName} 를 찾았어요.`);
  }
  io.out(host.reason);
  io.out(host.pasteWhere);
  io.out(host.buildSnippet(opts, io.platform));
}

function isPermissionError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const code = (error as { code?: unknown }).code;
  if (code === "EACCES" || code === "EPERM") {
    return true;
  }
  return false;
}

function describeError(error: unknown): string {
  // No sudo, no elevated retry, ever — the user fixes permissions themselves.
  if (isPermissionError(error)) {
    return PERMISSION_DENIED_HINT;
  }
  if (error instanceof Error && error.message !== "") {
    return `예상하지 못한 문제가 생겼어요. (${error.message})`;
  }
  return "예상하지 못한 문제가 생겼어요.";
}

/** Empty answer defaults to Y; only an explicit n/no declines. */
function answeredNo(answer: string): boolean {
  const normalized = answer.trim().toLowerCase();
  if (normalized === "n" || normalized === "no") {
    return true;
  }
  return false;
}

function tier2Snippet(
  host: FileHost,
  opts: ServerEntryOptions,
  platform: string,
): string {
  const entry = buildEntryForHost(host, opts, platform);
  return JSON.stringify({ mcpServers: { [SERVER_NAME]: entry } }, null, 2);
}

async function applyCliInstall(
  io: Io,
  host: CliHost,
  opts: ServerEntryOptions,
): Promise<HostResult> {
  const useShell = io.platform === "win32";
  // Remove-then-add makes re-running the install command an idempotent
  // upsert — and re-running that exact command is the only recovery
  // primitive the docs ever offer. The remove outcome is ignored on purpose.
  await io.spawn(host.bin, host.buildRemoveArgs(), { shell: useShell });
  const result = await io.spawn(host.bin, host.buildAddArgs(opts), {
    shell: useShell,
  });
  if (result.code === 0) {
    return {
      hostId: host.id,
      displayName: host.displayName,
      tier: 1,
      status: "success",
      message: "연결했어요.",
    };
  }
  return {
    hostId: host.id,
    displayName: host.displayName,
    tier: 1,
    status: "failed",
    message: `명령어 실행이 실패했어요. (종료 코드 ${result.code})`,
  };
}

async function applyFileInstall(
  io: Io,
  detected: DetectedHost,
  opts: ServerEntryOptions,
): Promise<HostResult> {
  const host = detected.file;
  const configPath = detected.configPath;
  if (host === undefined || configPath === undefined) {
    return {
      hostId: detected.id,
      displayName: detected.displayName,
      tier: 2,
      status: "failed",
      message: describeError(null),
    };
  }
  const entry = buildEntryForHost(host, opts, io.platform);
  const outcome = await upsertServerKey(io, configPath, entry);
  if (outcome.ok) {
    const result: HostResult = {
      hostId: host.id,
      displayName: host.displayName,
      tier: 2,
      status: "success",
      message: "설정 파일에 추가했어요.",
    };
    if (outcome.backupPath !== undefined) {
      result.backupPath = outcome.backupPath;
    }
    return result;
  }
  if (outcome.reason === "parse") {
    io.out(
      `${host.displayName} 설정 파일을 해석할 수 없어 자동 수정하지 않아요: ${configPath}`,
    );
    io.out("아래 내용을 직접 붙여넣어 주세요.");
    io.out(tier2Snippet(host, opts, io.platform));
    return {
      hostId: host.id,
      displayName: host.displayName,
      tier: 2,
      status: "failed",
      message:
        "설정 파일을 해석할 수 없어 수정하지 않았어요. 위에 출력된 내용을 직접 붙여넣어 주세요.",
    };
  }
  const failed: HostResult = {
    hostId: host.id,
    displayName: host.displayName,
    tier: 2,
    status: "failed",
    message:
      "쓰기 검증에 실패해서 백업으로 되돌렸어요. 같은 명령어를 다시 실행해 주세요.",
  };
  if (outcome.backupPath !== undefined) {
    failed.backupPath = outcome.backupPath;
  }
  return failed;
}

async function applyCliUninstall(io: Io, host: CliHost): Promise<HostResult> {
  const useShell = io.platform === "win32";
  const result = await io.spawn(host.bin, host.buildRemoveArgs(), {
    shell: useShell,
  });
  if (result.code === 0) {
    return {
      hostId: host.id,
      displayName: host.displayName,
      tier: 1,
      status: "success",
      message: "연결을 해제했어요.",
    };
  }
  // A non-zero exit usually means "no such server" — already the state the
  // user asked for, so it is not reported as a failure.
  return {
    hostId: host.id,
    displayName: host.displayName,
    tier: 1,
    status: "skipped",
    message: "이미 해제되어 있거나 등록된 항목이 없어요.",
  };
}

async function applyFileUninstall(
  io: Io,
  detected: DetectedHost,
): Promise<HostResult> {
  const host = detected.file;
  const configPath = detected.configPath;
  if (host === undefined || configPath === undefined) {
    return {
      hostId: detected.id,
      displayName: detected.displayName,
      tier: 2,
      status: "failed",
      message: describeError(null),
    };
  }
  const outcome = await removeServerKey(io, configPath);
  if (outcome.ok && outcome.changed) {
    const result: HostResult = {
      hostId: host.id,
      displayName: host.displayName,
      tier: 2,
      status: "success",
      message: "설정 파일에서 항목을 지웠어요.",
    };
    if (outcome.backupPath !== undefined) {
      result.backupPath = outcome.backupPath;
    }
    return result;
  }
  if (outcome.ok) {
    return {
      hostId: host.id,
      displayName: host.displayName,
      tier: 2,
      status: "skipped",
      message: "설정에 지울 항목이 없어요.",
    };
  }
  if (outcome.reason === "parse") {
    return {
      hostId: host.id,
      displayName: host.displayName,
      tier: 2,
      status: "failed",
      message: `설정 파일을 해석할 수 없어 수정하지 않았어요. "${SERVER_NAME}" 항목이 있다면 직접 지워 주세요: ${configPath}`,
    };
  }
  const failed: HostResult = {
    hostId: host.id,
    displayName: host.displayName,
    tier: 2,
    status: "failed",
    message: "쓰기 검증에 실패해서 백업으로 되돌렸어요.",
  };
  if (outcome.backupPath !== undefined) {
    failed.backupPath = outcome.backupPath;
  }
  return failed;
}

function filterByRequestedHosts(
  detected: DetectedHost[],
  hosts: string[] | undefined,
): DetectedHost[] {
  if (hosts === undefined || hosts.length === 0) {
    return detected;
  }
  return detected.filter((d) => hosts.includes(d.id));
}

/**
 * Resolve the token (and default the extension id) for an install.
 *
 * Three cases:
 *   - token already present (the panel's copy button filled it) → pass through.
 *   - token missing, a human is at the keyboard → ask for it, with one retry on
 *     a malformed paste. The extension id defaults to the published store id,
 *     which is what all but dev users need; a dev build passes --extension-id.
 *   - token missing, stdin is piped → we cannot prompt, so tell them how to
 *     supply it and stop. Returning null means "already handled, exit 1".
 */
async function resolveInstallCredentials(
  opts: RunOptions,
  io: Io,
): Promise<RunOptions | null> {
  if (typeof opts.token === "string" && opts.token !== "") {
    return opts;
  }

  if (!io.isInteractive()) {
    io.out(TOKEN_REQUIRED_NON_INTERACTIVE);
    return null;
  }

  io.out(TOKEN_PROMPT_GUIDE);
  // One retry: a first paste that picks up a trailing space or a partial
  // selection is common, and a single re-ask is kinder than a hard failure.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const entered = await io.prompt(TOKEN_PROMPT_QUESTION);
    if (TOKEN_RE.test(entered)) {
      return {
        ...opts,
        token: entered,
        extensionId: opts.extensionId ?? DEFAULT_EXTENSION_ID,
      };
    }
    if (attempt === 0) io.out(TOKEN_PROMPT_RETRY);
  }
  // Second bad paste: fall through to validation, which prints the standard
  // refusal. Returning the un-filled opts keeps the exit path in one place.
  return { ...opts, extensionId: opts.extensionId ?? DEFAULT_EXTENSION_ID };
}

export async function runInstall(opts: RunOptions, io: Io): Promise<number> {
  // The brand greeting comes first, before the token prompt or the scan — the
  // bare `install` command's first interaction is the token paste, and a
  // non-technical user should see who they are talking to before that. Printed
  // via io.out only (no spawn/write), so the "no io before validation" security
  // invariant the arg tests pin is untouched.
  printBanner((line) => io.out(line), INSTALL_SUBTITLE);

  // Fill in the token (and default the extension id) BEFORE validation. A bare
  // `install` carries neither: the panel's copy button supplies both, but a
  // user who typed the short command gets asked for just the token here. This
  // is the step whose absence made a bare `install` dead-end on a validation
  // error instead of walking the user through it.
  const resolved = await resolveInstallCredentials(opts, io);
  if (resolved === null) return 1;

  // Validation still gates ANY spawn or write — these values reach shell argv
  // and config files, so an interactively-pasted token passes the same regex.
  const validationError = validateInstallOptions(resolved);
  if (validationError !== null) {
    io.out(validationError);
    return 1;
  }
  const entryOpts: ServerEntryOptions = {
    version: resolved.version,
    token: resolved.token as string,
    extensionId: resolved.extensionId as string,
  };
  if (resolved.port !== undefined) {
    entryOpts.port = resolved.port;
  }

  let detected = filterByRequestedHosts(await detectHosts(io), opts.hosts);
  if (detected.length === 0) {
    // Nothing installed yet — offer to install a Node CLI in place (the user's
    // choice, never forced). If they pick one and it installs, re-scan and
    // continue; a fresh global bin that is not yet on PATH falls back to a
    // "open a new terminal and re-run" message rather than a confusing failure.
    const chosen = await offerCliInstall(io);
    if (chosen !== null && (await installCli(io, chosen))) {
      detected = filterByRequestedHosts(await detectHosts(io), opts.hosts);
      if (detected.length === 0) {
        io.out(cliInstalledRetry(chosen.displayName));
        return 0;
      }
    }
    if (detected.length === 0) {
      printSupportedApps(io);
      return 1;
    }
  }

  printDetected(io, detected);

  const actionable = detected.filter((d) => d.tier !== 3);
  if (actionable.length > 0 && opts.yes !== true) {
    const answer = await io.ask(installQuestion(actionable.length));
    if (answeredNo(answer)) {
      io.out(NOTHING_CHANGED);
      return 0;
    }
  }

  const results: HostResult[] = [];
  for (const d of detected) {
    try {
      if (d.tier === 1 && d.cli !== undefined) {
        results.push(await applyCliInstall(io, d.cli, entryOpts));
      } else if (d.tier === 2) {
        results.push(await applyFileInstall(io, d, entryOpts));
      } else if (d.snippet !== undefined) {
        results.push({
          hostId: d.id,
          displayName: d.displayName,
          tier: 3,
          status: "skipped",
          message: `${d.snippet.reason} 아래 안내를 확인해 주세요.`,
        });
      }
    } catch (error) {
      results.push({
        hostId: d.id,
        displayName: d.displayName,
        tier: d.tier,
        status: "failed",
        message: describeError(error),
      });
    }
  }

  io.out("");
  for (const result of results) {
    printResult(io, result);
    if (result.status === "success" && result.tier === 1) {
      const cliHost = CLI_HOSTS.find((h) => h.id === result.hostId);
      if (cliHost !== undefined && cliHost.note !== undefined) {
        io.out(`        ${cliHost.note}`);
      }
    }
  }

  for (const d of detected) {
    if (d.tier === 3 && d.snippet !== undefined) {
      printSnippetBlock(io, d.snippet, entryOpts);
    }
  }

  const anyConfigured = results.some((r) => r.status === "success");
  const anyFailed = results.some((r) => r.status === "failed" && r.tier !== 3);
  if (anyConfigured) {
    io.out("");
    io.out(RESTART_NOTICE);
  }
  if (anyFailed) {
    return 1;
  }
  return 0;
}

export async function runUninstall(opts: RunOptions, io: Io): Promise<number> {
  printBanner((line) => io.out(line), UNINSTALL_SUBTITLE);

  const validationError = validateUninstallOptions(opts);
  if (validationError !== null) {
    io.out(validationError);
    return 1;
  }

  const detected = filterByRequestedHosts(await detectHosts(io), opts.hosts);
  if (detected.length === 0) {
    io.out("정리할 항목을 찾지 못했어요.");
    io.out(UNINSTALL_DONE);
    io.out(UNINSTALL_TOKEN_REMINDER);
    return 0;
  }

  printDetected(io, detected);

  const actionable = detected.filter((d) => d.tier !== 3);
  if (actionable.length > 0 && opts.yes !== true) {
    const answer = await io.ask(uninstallQuestion(actionable.length));
    if (answeredNo(answer)) {
      io.out(NOTHING_CHANGED);
      return 0;
    }
  }

  const results: HostResult[] = [];
  for (const d of detected) {
    try {
      if (d.tier === 1 && d.cli !== undefined) {
        results.push(await applyCliUninstall(io, d.cli));
      } else if (d.tier === 2) {
        results.push(await applyFileUninstall(io, d));
      } else if (d.snippet !== undefined) {
        results.push({
          hostId: d.id,
          displayName: d.displayName,
          tier: 3,
          status: "skipped",
          message: `자동 수정하지 않아요. 설정에 "${SERVER_NAME}" 항목이 있다면 직접 지워 주세요. 지우지 않아도 아무 일도 하지 않아요.`,
        });
      }
    } catch (error) {
      results.push({
        hostId: d.id,
        displayName: d.displayName,
        tier: d.tier,
        status: "failed",
        message: describeError(error),
      });
    }
  }

  io.out("");
  for (const result of results) {
    printResult(io, result);
  }

  io.out("");
  io.out(UNINSTALL_DONE);
  io.out(UNINSTALL_TOKEN_REMINDER);

  const anyFailed = results.some((r) => r.status === "failed" && r.tier !== 3);
  if (anyFailed) {
    return 1;
  }
  return 0;
}
