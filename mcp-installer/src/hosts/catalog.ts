/**
 * The skill catalog at skills.modoo.today, registered beside the extension
 * connector. Only programs whose remote-server command was measured are
 * registered automatically; every other one gets a guide, because a wrong
 * automatic entry is worse than an instruction.
 */
export const CATALOG_SERVER_NAME = "modoo-today-skills";
export const CATALOG_URL = "https://skills.modoo.today/mcp";

export interface CatalogCommand {
  readonly bin: string;
  add(): string[];
  remove(): string[];
}

const COMMANDS: Readonly<Record<string, CatalogCommand>> = {
  claude: {
    bin: "claude",
    add: () => [
      "mcp",
      "add",
      "--transport",
      "http",
      CATALOG_SERVER_NAME,
      CATALOG_URL,
      "--scope",
      "user",
    ],
    remove: () => ["mcp", "remove", CATALOG_SERVER_NAME, "--scope", "user"],
  },
  codex: {
    bin: "codex",
    add: () => ["mcp", "add", CATALOG_SERVER_NAME, "--url", CATALOG_URL],
    remove: () => ["mcp", "remove", CATALOG_SERVER_NAME],
  },
};

/** The command that registers the catalog in this program, or null for a guide. */
export function catalogCommand(hostId: string): CatalogCommand | null {
  return COMMANDS[hostId] ?? null;
}

const DESKTOP_IDS = new Set(["claude-desktop", "claude-desktop-linux"]);

/** What a person does by hand in a program the catalog is not written into. */
export function catalogGuide(hostId: string): readonly string[] {
  if (DESKTOP_IDS.has(hostId)) {
    return ["설정 › 커넥터 › 사용자 지정 커넥터 추가", `주소  ${CATALOG_URL}`];
  }
  return [
    "MCP 설정에 원격(HTTP) 서버로 아래를 추가해 주세요.",
    `이름  ${CATALOG_SERVER_NAME}`,
    `주소  ${CATALOG_URL}`,
  ];
}

/** How to take the catalog out again, for the uninstall card. */
export function catalogRemovalHint(hostId: string): string | null {
  const command = catalogCommand(hostId);
  return command === null
    ? null
    : `${command.bin} ${command.remove().join(" ")}`;
}
