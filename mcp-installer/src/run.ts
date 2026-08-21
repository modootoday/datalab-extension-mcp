/**
 * The orchestrator — detection, the one question, per-host application, and the
 * closing copy. All I/O goes through the injected seam.
 *
 * Failure isolation is the invariant: one host throwing must never stop the
 * others, because the user runs this once and expects a per-host verdict.
 */
import {
  INSTALL_SUBTITLE,
  UNINSTALL_SUBTITLE,
  printBanner,
  printStep,
} from "./banner.js";
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
  placeSkills,
  removeSkills,
  skillsPayloadRoot,
  stagedSlugs,
} from "./run-skills.js";
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
  ALREADY_INSTALLED_HINT,
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
import { reclaimPort } from "./reclaim.js";
import { removeServerKey, upsertServerKey } from "./write-json.js";
import { removeTomlServer, upsertTomlServer } from "./write-toml.js";
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
 * Scan for every known host. CLIs are probed by running them; file hosts count
 * as present when the config file or its parent app directory exists, since a
 * fresh install often has the directory and no config yet.
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
    // A path that must be resolved against the filesystem wins: a Store
    // install redirects app data into its package container, so writing to the
    // plain location reports success the app never sees.
    let configPath: string | null = null;
    if (host.resolveConfigPath !== undefined) {
      try {
        configPath = await host.resolveConfigPath(io);
      } catch {
        configPath = null;
      }
    }
    configPath ??= host.configPath(io);
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
  // Printed before the download list: many users who reach here already
  // installed an app whose config does not exist until first use, and leading
  // with download links tells them to redo what they have already done.
  io.out(ALREADY_INSTALLED_HINT);
  io.out("");
  io.out(SUPPORTED_APPS_HEADER);
  for (const app of SUPPORTED_APPS) {
    io.out(`  - ${app.name}: ${app.url}`);
  }
  io.out(AFTER_INSTALL_RETRY);
}

/**
 * Optional offer taken when nothing was detected: install a host CLI here and
 * now. Returns the chosen one, or null when the user declines or there is no
 * terminal.  Never forced — any non-selecting reply declines and falls
 * through to the download list.
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

/** Install the chosen CLI globally, streaming the package manager's progress. */
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

/**
 * Create a snippet host's config file, but only when it is absent.
 *
 * This does not weaken the never-write rule: an existing file is still left
 * byte-for-byte alone, and there is nothing to merge when none exists.
 *
 * A vendor CLI is not used even where one exists: the Windows spawn path
 * joins its arguments into one string, and a JSON argument breaks the
 * validation that makes the join safe. Failure still prints the snippet.
 */
/**
 * Merge our table into a snippet host's TOML config.
 *
 * The never-write rule existed because an existing config could not be merged
 * safely. It can: write-toml replaces the span our own table occupies and
 * leaves every other byte alone, refusing any shape it cannot locate. Null
 * here means "not handled" and the caller falls through to create-or-print, so
 * a refusal still ends with the user holding a snippet that works.
 */
async function mergeSnippetToml(
  io: Io,
  host: SnippetHost,
  opts: ServerEntryOptions,
): Promise<HostResult | null> {
  if (host.tomlServerName === undefined) {
    return null;
  }
  const path = host.detectedPath(io);
  if (path === null || !(await io.exists(path))) {
    return null;
  }
  const outcome = await upsertTomlServer(
    io,
    path,
    host.buildSnippet(opts, io.platform),
    host.tomlServerName,
  );
  if (!outcome.ok) {
    return null;
  }
  return {
    hostId: host.id,
    displayName: host.displayName,
    tier: 3,
    status: "success",
    message: outcome.changed
      ? `설정 파일을 고쳤어요: ${path}`
      : `설정 파일이 이미 최신이에요: ${path}`,
  };
}

/** Uninstall side of mergeSnippetToml. Null falls through to the advice. */
async function removeSnippetToml(
  io: Io,
  host: SnippetHost,
): Promise<HostResult | null> {
  if (host.tomlServerName === undefined) {
    return null;
  }
  const path = host.detectedPath(io);
  if (path === null || !(await io.exists(path))) {
    return null;
  }
  const outcome = await removeTomlServer(io, path, host.tomlServerName);
  if (!outcome.ok) {
    return null;
  }
  return {
    hostId: host.id,
    displayName: host.displayName,
    tier: 3,
    status: "success",
    message: outcome.changed
      ? `설정 파일에서 지웠어요: ${path}`
      : `설정 파일에 우리 항목이 없었어요: ${path}`,
  };
}

async function bootstrapSnippetFile(
  io: Io,
  host: SnippetHost,
  opts: ServerEntryOptions,
): Promise<HostResult | null> {
  if (host.bootstrapWhenAbsent !== true) {
    return null;
  }
  const path = host.detectedPath(io);
  if (path === null || (await io.exists(path))) {
    return null;
  }
  const cut = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  if (cut > 0) {
    await io.mkdir(path.slice(0, cut));
  }
  // Trailing newline: a human will edit this file next.
  await io.writeFile(path, `${host.buildSnippet(opts, io.platform)}\n`);
  return {
    hostId: host.id,
    displayName: host.displayName,
    tier: 3,
    status: "success",
    message: `설정 파일이 없어서 새로 만들었어요: ${path}`,
  };
}

/**
 * Says something different depending on whether the file exists. Detection
 * accepts a parent directory alone, so calling a missing file a found location
 * would name a path the user cannot see and make the guidance look wrong —
 * when in fact the app creates that file on first use.
 */
async function printSnippetBlock(
  io: Io,
  host: SnippetHost,
  opts: ServerEntryOptions,
): Promise<void> {
  io.out("");
  const path = host.detectedPath(io);
  if (path === null) {
    io.out(`${host.displayName} 를 찾았어요.`);
  } else if (await io.exists(path)) {
    io.out(`${host.displayName} — 찾은 위치: ${path}`);
  } else {
    io.out(`${host.displayName} — 설정 파일이 아직 없어요: ${path}`);
    if (host.createHint !== undefined) {
      io.out(host.createHint);
    }
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
  // No elevated retry, ever — the user fixes permissions themselves.
  if (isPermissionError(error)) {
    return PERMISSION_DENIED_HINT;
  }
  // Every branch names a next action; a diagnosis alone leaves the reader
  // holding an error and no move.
  const next =
    " 같은 명령을 한 번 더 실행해 보시고, 그래도 안 되면 알려 주세요.";
  if (error instanceof Error && error.message !== "") {
    return `예상하지 못한 문제가 생겼어요.${next} (${error.message})`;
  }
  return `예상하지 못한 문제가 생겼어요.${next}`;
}

/** An empty answer accepts; only an explicit negative declines. */
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
  // Remove-then-add makes re-running the install an idempotent upsert, and
  // re-running it is the only recovery step the docs offer. The remove outcome
  // is ignored on purpose.
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
  // A non-zero exit usually means there was no such server, which is already
  // the state the user asked for, so it is not reported as a failure.
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
 * Resolve the token, and default the extension id, for an install. A token
 * already supplied passes through; a missing one is prompted for when a human
 * is present, or explained and refused when stdin is piped. Null means the
 * caller has already been told and should exit non-zero.
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
  // selection is common, and re-asking once beats a hard failure.
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
  // A second bad paste falls through to validation, which prints the standard
  // refusal, keeping the exit path in one place.
  return { ...opts, extensionId: opts.extensionId ?? DEFAULT_EXTENSION_ID };
}

export async function runInstall(opts: RunOptions, io: Io): Promise<number> {
  // The greeting comes before the prompt and the scan, so a non-technical user
  // sees who they are talking to first.  Printing only — no spawn or write —
  // so the "nothing happens before validation" invariant holds.
  printBanner((line) => io.out(line), INSTALL_SUBTITLE);

  // The token is filled in before validation, because the short form of the
  // command carries none and the user is asked for it here instead of
  // dead-ending on a validation error.
  printStep((line) => io.out(line), 1, 4, "연결 키 확인");
  const resolved = await resolveInstallCredentials(opts, io);
  if (resolved === null) return 1;

  // Validation still gates any spawn or write: these values reach shell argv
  // and config files, so an interactively pasted token passes the same checks.
  const validationError = validateInstallOptions(resolved);
  if (validationError !== null) {
    io.out(validationError);
    return 1;
  }
  // Closes the chapter. With --token supplied the step is silent otherwise,
  // and a header with nothing under it reads as something that failed.
  io.out("  인증키를 확인했어요.");
  const entryOpts: ServerEntryOptions = {
    version: resolved.version,
    token: resolved.token as string,
    extensionId: resolved.extensionId as string,
  };
  if (resolved.port !== undefined) {
    entryOpts.port = resolved.port;
  }

  // The scan spawns several processes and says nothing while it does, which
  // reads as a hang on a slow machine. One line before it costs nothing.
  printStep((line) => io.out(line), 2, 4, "연결할 AI 프로그램 찾기");
  io.out("  설치된 프로그램을 확인하는 중이에요…");
  let detected = filterByRequestedHosts(await detectHosts(io), opts.hosts);
  if (detected.length === 0) {
    // Nothing installed yet, so offer to install a CLI in place. On success,
    // re-scan; a fresh global bin not yet on PATH gets a "reopen the terminal"
    // message rather than a confusing failure.
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

  printStep((line) => io.out(line), 3, 4, "연결하는 중");
  const results: HostResult[] = [];
  for (const d of detected) {
    try {
      if (d.tier === 1 && d.cli !== undefined) {
        results.push(await applyCliInstall(io, d.cli, entryOpts));
      } else if (d.tier === 2) {
        results.push(await applyFileInstall(io, d, entryOpts));
      } else if (d.snippet !== undefined) {
        // Merged when we can locate our own table, created when absent, and
        // otherwise untouched with the snippet printed instead.
        const merged = await mergeSnippetToml(io, d.snippet, entryOpts);
        const made =
          merged ?? (await bootstrapSnippetFile(io, d.snippet, entryOpts));
        results.push(
          made ?? {
            hostId: d.id,
            displayName: d.displayName,
            tier: 3,
            status: "skipped",
            message: `${d.snippet.reason} 아래 안내를 확인해 주세요.`,
          },
        );
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

  // The configs now name this token; the connector that is already running
  // does not. Left alone it refuses every one of them and outlives the fix,
  // so this is where it gets cleared — while a local shell is in hand.
  const reclaimed = await reclaimPort(io, entryOpts.token, {
    version: entryOpts.version,
    ...(entryOpts.port === undefined ? {} : { port: entryOpts.port }),
  });
  if (reclaimed.kind === "retired" || reclaimed.kind === "forced") {
    io.out("  예전 연결 프로그램을 정리했어요.");
  } else if (reclaimed.kind === "foreign") {
    io.out(
      "  포트 8765를 다른 프로그램이 쓰고 있어요. 그 프로그램을 끄고 다시 실행해 주세요.",
    );
  } else if (reclaimed.kind === "failed") {
    io.out(
      "  예전 연결 프로그램을 정리하지 못했어요. AI 앱을 모두 종료한 뒤 다시 실행해 주세요.",
    );
  }

  // Skills follow the same detection: a host the user does not have is never
  // written to. Default on; --no-skills opts out.
  if (opts.skills !== false) {
    results.push(
      ...(await placeSkills(
        io,
        skillsPayloadRoot(),
        new Set(detected.map((d) => d.id)),
        opts.version,
        opts.allSkills === true,
      )),
    );
  }

  printStep((line) => io.out(line), 4, 4, "결과");
  for (const result of results) {
    printResult(io, result);
    if (result.status === "success" && result.tier === 1) {
      const cliHost = CLI_HOSTS.find((h) => h.id === result.hostId);
      if (cliHost !== undefined && cliHost.note !== undefined) {
        io.out(`        ${cliHost.note}`);
      }
    }
  }
  // A count, because a list of lines answers "what happened to each" but not
  // "did it work" — which is the only question the person actually has.
  const connected = results.filter(
    (r) => r.status === "success" && r.surface !== "skills",
  ).length;
  const failed = results.filter(
    (r) => r.status === "failed" && r.tier !== 3,
  ).length;
  io.out("");
  io.out(
    failed === 0
      ? `${String(connected)}개 프로그램에 연결했어요.`
      : `${String(connected)}개 연결, ${String(failed)}개 실패.`,
  );

  for (const d of detected) {
    if (d.tier === 3 && d.snippet !== undefined) {
      await printSnippetBlock(io, d.snippet, entryOpts);
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
        // Symmetric with install: what we merged in, we take out again.
        const removed = await removeSnippetToml(io, d.snippet);
        results.push(
          removed ?? {
            hostId: d.id,
            displayName: d.displayName,
            tier: 3,
            status: "skipped",
            message: `자동 수정하지 않아요. 설정에 "${SERVER_NAME}" 항목이 있다면 직접 지워 주세요. 지우지 않아도 아무 일도 하지 않아요.`,
          },
        );
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

  // Only slugs this build ships, and only where our marker proves we placed
  // them — anything another tool installed is reported and left alone.
  if (opts.skills !== false) {
    const root = skillsPayloadRoot();
    results.push(
      ...(await removeSkills(
        io,
        new Set(detected.map((d) => d.id)),
        await stagedSlugs(io, root),
      )),
    );
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
