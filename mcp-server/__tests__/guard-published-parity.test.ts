/**
 * Does the documentation say what the code does?
 *
 * What this catches is not a bug but a false statement: changing a limit
 * breaks nothing and every test still passes, while the published document
 * quietly names the wrong number — and a release cannot be re-cut at the same
 * version. Both language editions are checked, because fixing one and
 * forgetting the other leaves half the readers with the wrong document.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  BRIDGE_LIMITS,
  staticDiscoveryCatalog,
} from "@modootoday/extension-app-mcp-core";
import { describe, expect, it } from "vitest";

import { mediaToolDescriptors } from "../src/media-tools.js";

const readDoc = (name: string): string =>
  readFileSync(fileURLToPath(new URL(`../../mcp/${name}`, import.meta.url)), {
    encoding: "utf8",
  });

const READMES: ReadonlyArray<readonly [string, string]> = [
  ["README.md", readDoc("README.md")],
  ["README.en.md", readDoc("README.en.md")],
];

/** Where the canonical list lives; the documentation links here. */
const CANONICAL_SOURCE = "mcp-core/src/errors.ts";

describe("published docs match the code", () => {
  it("found both readmes", () => {
    for (const [name, text] of READMES) {
      expect(text.length, name).toBeGreaterThan(0);
    }
  });

  /**
   * A troubleshooting heading is the one line a reader arrives by, having
   * typed the number their app showed them. Wrong, it answers nobody: the
   * reader with the real count never reaches the section written for them.
   * Both halves are counted here rather than written down — the façade the
   * daemon serves plus the tools it owns is exactly what a host is handed.
   */
  it("문제해결 제목이 호스트가 실제로 보는 개수를 적는다", () => {
    const seen =
      staticDiscoveryCatalog().length + mediaToolDescriptors().length;
    const HEADINGS: ReadonlyArray<readonly [string, RegExp]> = [
      ["README.md", /도구가 (\d+)개밖에 안 보여요/],
      ["README.en.md", /I only see (\d+) tools/],
    ];
    for (const [name, re] of HEADINGS) {
      const text = READMES.find(([n]) => n === name)?.[1] ?? "";
      const said = re.exec(text)?.[1];
      expect(
        said,
        `${name}: 제목을 못 찾음 — 문구가 바뀌었으면 이 정규식도`,
      ).toBeDefined();
      expect(Number(said), `${name}: 문서 ${said} vs 실제 ${seen}`).toBe(seen);
    }
  });

  // Forces the documentation to move in the same commit as the constant.
  it("quotes the rate limit the bridge actually enforces", () => {
    for (const [name, text] of READMES) {
      expect(text, `${name}: burst`).toContain(`\`${BRIDGE_LIMITS.capacity}\``);
      expect(text, `${name}: refill`).toContain(
        `\`${BRIDGE_LIMITS.refillPerSecond}\``,
      );
    }
  });

  /**
   * The number alone was checked, and the qualifier beside it is the part
   * that can become false: the budget belongs to the connector, so two browsers
   * on one connector share it. A document promising each of them the whole
   * burst would pass a numbers-only check word for word.
   */
  it("한도가 누구 것인지도 맞게 적는다", () => {
    for (const [name, text] of READMES) {
      expect(text, `${name}: scope`).not.toMatch(/세션당|per session/);
      expect(text, `${name}: shared`).toMatch(/함께 씁니다|share that budget/);
    }
  });

  // The failure body's field names are the contract a caller branches on, and
  // they are short and stable enough to state in the document directly.
  it("names the fields a caller branches on", () => {
    for (const [name, text] of READMES) {
      for (const field of ["ok", "reason", "message", "retryable"]) {
        expect(text, `${name}: ${field}`).toContain(`\`${field}\``);
      }
      expect(text, `${name}: retryAfterMs`).toContain("retryAfterMs");
    }
  });

  // A link that misses the canonical file sends the reader nowhere, which is
  // what leaving the code list out of the document depends on.
  it("points at the canonical source instead of copying it", () => {
    for (const [name, text] of READMES) {
      expect(text, `${name}: canonical link`).toContain(CANONICAL_SOURCE);
    }
  });

  // Keeps the code table out of the consumer-facing document: once it is
  // there, every new code has to be mirrored by hand in two languages.
  it("keeps the code table out of the consumer doc", () => {
    for (const [name, text] of READMES) {
      for (const code of [
        "confirm_too_late",
        "missing_in_build",
        "multiple_editors",
      ]) {
        expect(text, `${name} inlines ${code}`).not.toContain(code);
      }
    }
  });
});
