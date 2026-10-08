/**
 * The datalab extension connector on one program: registered by the vendor
 * CLI, merged into a strict-JSON file, or written into a snippet host's file
 * when that is safe, otherwise handed to the person as a card.
 */
import {
  SERVER_NAME,
  buildEntryForHost,
  type CliHost,
  type ServerEntryOptions,
  type SnippetHost,
} from "../hosts.js";
import {
  DETAIL,
  PERMISSION_DENIED_HINT,
  SURFACE,
  UNEXPECTED_ERROR,
  UNINSTALL_ROW,
  extensionGuideTitle,
} from "../strings.js";
import type { Io } from "../types.js";
import {
  removeServerKey,
  upsertServerKey,
  type WriteOutcome,
} from "../write-json.js";
import { removeTomlServer, upsertTomlServer } from "../write-toml.js";
import type { DetectedHost } from "./detect.js";
import type { Card, Outcome } from "./report.js";

export interface ActionContext {
  readonly io: Io;
  readonly opts: ServerEntryOptions;
  /** Backup paths and exit codes join the detail lines. */
  readonly verbose: boolean;
}

export async function installExtension(
  ctx: ActionContext,
  host: DetectedHost,
): Promise<Outcome> {
  try {
    if (host.cli !== undefined) return await installByCli(ctx, host.cli);
    if (host.file !== undefined) return await installByFile(ctx, host);
    if (host.snippet !== undefined) {
      return await installBySnippet(ctx, host.snippet);
    }
    return failed(SURFACE.extension, UNEXPECTED_ERROR);
  } catch (error) {
    return failed(SURFACE.extension, describeError(error));
  }
}

export async function removeExtension(
  ctx: Pick<ActionContext, "io" | "verbose">,
  host: DetectedHost,
): Promise<Outcome> {
  try {
    if (host.cli !== undefined) return await removeByCli(ctx.io, host.cli);
    if (host.file !== undefined) return await removeByFile(ctx, host);
    if (host.snippet !== undefined) {
      return await removeBySnippet(ctx.io, host.snippet);
    }
    return failed(UNINSTALL_ROW.extension, UNEXPECTED_ERROR);
  } catch (error) {
    return failed(UNINSTALL_ROW.extension, describeError(error));
  }
}

export function describeError(error: unknown): string {
  // No elevated retry, ever: the person fixes permissions themselves.
  if (isPermissionError(error)) return PERMISSION_DENIED_HINT;
  return UNEXPECTED_ERROR;
}

function failed(label: string, detail: string, card?: Card): Outcome {
  return card === undefined
    ? { row: { status: "실패", label, detail } }
    : { row: { status: "실패", label, detail }, card };
}

function isPermissionError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: unknown }).code;
  return code === "EACCES" || code === "EPERM";
}

function withBackup(
  detail: string | undefined,
  outcome: WriteOutcome,
  verbose: boolean,
): string | undefined {
  if (outcome.backupPath === undefined) return detail;
  const backup = verbose
    ? `${DETAIL.backedUp} ${outcome.backupPath}`
    : DETAIL.backedUp;
  return detail === undefined ? backup : `${detail} ${backup}`;
}

async function installByCli(
  ctx: ActionContext,
  cli: CliHost,
): Promise<Outcome> {
  const shell = ctx.io.platform === "win32";
  // Remove-then-add makes re-running the install an idempotent upsert, and
  // re-running it is the only recovery the docs offer. The remove outcome is
  // ignored on purpose.
  await ctx.io.spawn(cli.bin, cli.buildRemoveArgs(), { shell });
  const result = await ctx.io.spawn(cli.bin, cli.buildAddArgs(ctx.opts), {
    shell,
  });
  if (result.code !== 0) {
    const code = ctx.verbose ? ` (종료 코드 ${String(result.code)})` : "";
    return failed(SURFACE.extension, `${DETAIL.commandFailed}${code}`);
  }
  return {
    row: {
      status: "완료",
      label: SURFACE.extension,
      ...(cli.note ? { detail: cli.note } : {}),
    },
  };
}

async function installByFile(
  ctx: ActionContext,
  host: DetectedHost,
): Promise<Outcome> {
  const configPath = host.configPath;
  if (configPath === undefined || host.file === undefined) {
    return failed(SURFACE.extension, UNEXPECTED_ERROR);
  }
  const entry = buildEntryForHost(host.file, ctx.opts, ctx.io.platform);
  const outcome = await upsertServerKey(ctx.io, configPath, entry);
  if (outcome.ok) {
    const detail = withBackup(undefined, outcome, ctx.verbose);
    return {
      row: {
        status: "완료",
        label: SURFACE.extension,
        ...(detail ? { detail } : {}),
      },
    };
  }
  if (outcome.reason !== "parse") {
    return failed(
      SURFACE.extension,
      withBackup(DETAIL.verify, outcome, ctx.verbose) ?? DETAIL.verify,
    );
  }
  const snippet = JSON.stringify(
    { mcpServers: { [SERVER_NAME]: entry } },
    null,
    2,
  );
  return failed(SURFACE.extension, DETAIL.parse, {
    tone: "failure",
    title: extensionGuideTitle(host.displayName),
    lines: [
      `${configPath} 의 mcpServers 안에 아래를 넣어 주세요.`,
      "",
      ...snippet.split("\n").map((line) => `  ${line}`),
    ],
  });
}

async function installBySnippet(
  ctx: ActionContext,
  host: SnippetHost,
): Promise<Outcome> {
  const merged = await mergeToml(ctx.io, host, ctx.opts);
  if (merged !== null) return merged;
  const created = await bootstrapFile(ctx.io, host, ctx.opts);
  if (created !== null) return created;
  return {
    row: { status: "직접", label: SURFACE.extension, detail: DETAIL.seeGuide },
    card: await snippetCard(ctx.io, host, ctx.opts),
  };
}

/** Merges our table into a snippet host's TOML; null means it could not be located. */
async function mergeToml(
  io: Io,
  host: SnippetHost,
  opts: ServerEntryOptions,
): Promise<Outcome | null> {
  if (host.tomlServerName === undefined) return null;
  const path = host.detectedPath(io);
  if (path === null || !(await io.exists(path))) return null;
  const outcome = await upsertTomlServer(
    io,
    path,
    host.buildSnippet(opts, io.platform),
    host.tomlServerName,
  );
  if (!outcome.ok) return null;
  return {
    row: {
      status: "완료",
      label: SURFACE.extension,
      detail: outcome.changed ? DETAIL.backedUp : DETAIL.upToDate,
    },
  };
}

/**
 * Creates a snippet host's config only when it is absent: an existing file is
 * left byte for byte, and there is nothing to merge when none exists.
 */
async function bootstrapFile(
  io: Io,
  host: SnippetHost,
  opts: ServerEntryOptions,
): Promise<Outcome | null> {
  if (host.bootstrapWhenAbsent !== true) return null;
  const path = host.detectedPath(io);
  if (path === null || (await io.exists(path))) return null;
  const cut = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  if (cut > 0) await io.mkdir(path.slice(0, cut));
  await io.writeFile(path, `${host.buildSnippet(opts, io.platform)}\n`);
  return {
    row: { status: "완료", label: SURFACE.extension, detail: DETAIL.created },
  };
}

/**
 * Says something different depending on whether the file exists: detection
 * accepts a parent directory alone, so naming a missing file as found would
 * point at a path the person cannot see.
 */
async function snippetCard(
  io: Io,
  host: SnippetHost,
  opts: ServerEntryOptions,
): Promise<Card> {
  const snippet = host
    .buildSnippet(opts, io.platform)
    .split("\n")
    .map((line) => `  ${line}`);
  return {
    tone: "attention",
    title: extensionGuideTitle(host.displayName),
    lines: [
      host.reason,
      ...(await whereLines(io, host)),
      host.pasteWhere,
      "",
      ...snippet,
    ],
  };
}

async function whereLines(io: Io, host: SnippetHost): Promise<string[]> {
  const path = host.detectedPath(io);
  if (path === null) return [];
  if (await io.exists(path)) return [`설정 파일  ${path}`];
  const lines = [`설정 파일(아직 없음)  ${path}`];
  if (host.createHint !== undefined) lines.push(host.createHint);
  return lines;
}

async function removeByCli(io: Io, cli: CliHost): Promise<Outcome> {
  const result = await io.spawn(cli.bin, cli.buildRemoveArgs(), {
    shell: io.platform === "win32",
  });
  // A non-zero exit usually means there was no such server, which is already
  // the state the person asked for.
  if (result.code !== 0) {
    return {
      row: {
        status: "건너뜀",
        label: UNINSTALL_ROW.extension,
        detail: DETAIL.notRegistered,
      },
    };
  }
  return { row: { status: "완료", label: UNINSTALL_ROW.extension } };
}

async function removeByFile(
  ctx: Pick<ActionContext, "io" | "verbose">,
  host: DetectedHost,
): Promise<Outcome> {
  const configPath = host.configPath;
  if (configPath === undefined) {
    return failed(UNINSTALL_ROW.extension, UNEXPECTED_ERROR);
  }
  const outcome = await removeServerKey(ctx.io, configPath);
  if (outcome.ok && outcome.changed) {
    const detail = withBackup(undefined, outcome, ctx.verbose);
    return {
      row: {
        status: "완료",
        label: UNINSTALL_ROW.extension,
        ...(detail ? { detail } : {}),
      },
    };
  }
  if (outcome.ok) {
    return {
      row: {
        status: "건너뜀",
        label: UNINSTALL_ROW.extension,
        detail: DETAIL.notRegistered,
      },
    };
  }
  if (outcome.reason === "parse") {
    return failed(
      UNINSTALL_ROW.extension,
      `${DETAIL.parse} "${SERVER_NAME}" 항목이 있으면 직접 지워 주세요.`,
    );
  }
  return failed(
    UNINSTALL_ROW.extension,
    withBackup(DETAIL.verify, outcome, ctx.verbose) ?? DETAIL.verify,
  );
}

async function removeBySnippet(io: Io, host: SnippetHost): Promise<Outcome> {
  const path = host.tomlServerName === undefined ? null : host.detectedPath(io);
  if (
    path !== null &&
    host.tomlServerName !== undefined &&
    (await io.exists(path))
  ) {
    const outcome = await removeTomlServer(io, path, host.tomlServerName);
    if (outcome.ok && outcome.changed) {
      return { row: { status: "완료", label: UNINSTALL_ROW.extension } };
    }
    if (outcome.ok) {
      return {
        row: {
          status: "건너뜀",
          label: UNINSTALL_ROW.extension,
          detail: DETAIL.notRegistered,
        },
      };
    }
  }
  return {
    row: {
      status: "건너뜀",
      label: UNINSTALL_ROW.extension,
      detail: `설정에 "${SERVER_NAME}" 항목이 있으면 직접 지워 주세요.`,
    },
  };
}
