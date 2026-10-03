import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: false,
  target: "node22",
  outDir: "dist",
  noExternal: [
    "@modootoday/datalab-extension-app-mcp-core",
    "@modootoday/datalab-extension-app-mcp-installer",
    "@modootoday/datalab-extension-app-mcp-server",
  ],
});
