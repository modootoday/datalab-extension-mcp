import { describe, expect, it } from "vitest";
import { PUBLISHED_EXTENSION_ID } from "@modootoday/datalab-extension-app-mcp-core";
import { DEFAULT_EXTENSION_ID } from "@modootoday/datalab-extension-app-mcp-installer";

describe("published extension id", () => {
  it("the installer writes the same id the connector allows by default", () => {
    expect(DEFAULT_EXTENSION_ID).toBe(PUBLISHED_EXTENSION_ID);
  });
});
