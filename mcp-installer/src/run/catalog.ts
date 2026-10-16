/**
 * The skill catalog on one program: registered by the program's own command
 * where that command was measured, otherwise a guide card for the person.
 */
import { catalogCommand, catalogGuide } from "../hosts.js";
import {
  DETAIL,
  SURFACE,
  UNINSTALL_ROW,
  catalogGuideTitle,
} from "../strings.js";
import type { Io } from "../types.js";
import type { DetectedHost } from "./detect.js";
import type { Outcome } from "./report.js";

export interface CatalogContext {
  readonly io: Io;
  readonly verbose: boolean;
  /** Colours an address inside a card line. */
  readonly link: (text: string) => string;
}

export async function installCatalog(
  ctx: CatalogContext,
  host: DetectedHost,
): Promise<Outcome> {
  const command = catalogCommand(host.id);
  if (command === null) {
    const lines = catalogGuide(host.id).map((line) =>
      line.replace(/https:\/\/\S+/u, (url) => ctx.link(url)),
    );
    return {
      row: { status: "직접", label: SURFACE.catalog, detail: DETAIL.seeGuide },
      card: {
        tone: "attention",
        title: catalogGuideTitle(host.displayName),
        lines,
      },
    };
  }
  const shell = ctx.io.platform === "win32";
  // Same idempotent upsert as the connector: an earlier entry with another
  // address is replaced rather than left beside the new one.
  await ctx.io.spawn(command.bin, command.remove(), { shell });
  const result = await ctx.io.spawn(command.bin, command.add(), { shell });
  if (result.code === 0) {
    return { row: { status: "완료", label: SURFACE.catalog } };
  }
  const code = ctx.verbose ? ` (종료 코드 ${String(result.code)})` : "";
  return {
    row: {
      status: "실패",
      label: SURFACE.catalog,
      detail: `${DETAIL.commandFailed}${code}`,
    },
  };
}

/** Null when this program never had the catalog written by us. */
export async function removeCatalog(
  io: Io,
  host: DetectedHost,
): Promise<Outcome | null> {
  const command = catalogCommand(host.id);
  if (command === null) return null;
  const result = await io.spawn(command.bin, command.remove(), {
    shell: io.platform === "win32",
  });
  if (result.code !== 0) {
    return {
      row: {
        status: "건너뜀",
        label: UNINSTALL_ROW.catalog,
        detail: DETAIL.notRegistered,
      },
    };
  }
  return { row: { status: "완료", label: UNINSTALL_ROW.catalog } };
}
