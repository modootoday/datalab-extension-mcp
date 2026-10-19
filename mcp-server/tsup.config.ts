import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/serve.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: false,
  target: "node22",
  outDir: "dist",
});
