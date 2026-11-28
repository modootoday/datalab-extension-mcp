import { createServer, type Server } from "node:net";
import { afterEach, describe, expect, it } from "vitest";

import { systemMeasureDeps } from "../src/listener-owner/index.js";

let server: Server | null = null;

afterEach(async () => {
  await new Promise<void>((resolve) => {
    if (server === null) {
      resolve();
      return;
    }
    server.close(() => resolve());
  });
  server = null;
});

function listen(): Promise<number> {
  return new Promise((resolve) => {
    server = createServer((socket) => socket.end());
    server.listen(0, "127.0.0.1", () => {
      const address = server?.address();
      resolve(typeof address === "object" && address ? address.port : 0);
    });
  });
}

describe("the system behind the measurement", () => {
  it("tells an open port from a closed one", async () => {
    const deps = systemMeasureDeps();
    const port = await listen();
    expect(await deps.portOpen(port)).toBe(true);
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    server = null;
    expect(await deps.portOpen(port)).toBe(false);
  });

  it("reports a command that cannot start as null and keeps an exit code", async () => {
    const deps = systemMeasureDeps();
    expect(await deps.run("datalab-no-such-command", [])).toBeNull();
    const failed = await deps.run(process.execPath, ["-e", "process.exit(3)"]);
    expect(failed?.code).toBe(3);
    const ok = await deps.run(process.execPath, ["-e", "console.log(1)"]);
    expect(ok).toEqual({ code: 0, stdout: "1\n" });
  });

  it("reads an unreadable file as null", async () => {
    expect(
      await systemMeasureDeps().readFile("/datalab-no-such-file"),
    ).toBeNull();
  });
});
