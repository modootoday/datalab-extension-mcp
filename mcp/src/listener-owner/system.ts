/** The real system behind the listener measurement. Only fixed commands run, with the port as an argument. */
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createConnection } from "node:net";

import type { MeasureDeps, RunOutput } from "./measure.js";

const RUN_TIMEOUT_MS = 5_000;
const CONNECT_TIMEOUT_MS = 1_000;

function run(
  command: string,
  args: readonly string[],
): Promise<RunOutput | null> {
  return new Promise((resolve) => {
    execFile(
      command,
      [...args],
      { encoding: "utf8", timeout: RUN_TIMEOUT_MS, windowsHide: true },
      (error, stdout) => {
        if (error === null) {
          resolve({ code: 0, stdout });
          return;
        }
        if (typeof error.code !== "number") {
          resolve(null);
          return;
        }
        resolve({ code: error.code, stdout: stdout ?? "" });
      },
    );
  });
}

function portOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    const done = (open: boolean): void => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(CONNECT_TIMEOUT_MS, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

export function systemMeasureDeps(): MeasureDeps {
  return {
    platform: process.platform,
    uid: typeof process.getuid === "function" ? process.getuid() : undefined,
    readFile: (path) => readFile(path, "utf8").catch(() => null),
    run,
    portOpen,
  };
}
