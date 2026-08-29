/**
 * Ending whatever holds the connector's port.
 *
 * The last resort behind the token and the takeover file. Reached only after
 * `/bridge/health` has already identified the holder as our connector, so this
 * never points at a stranger's process.
 *
 * One shell line rather than read-pid-then-kill: the pid is not needed
 * anywhere else, and whether it worked is answered by probing the port again —
 * which is the fact that matters, unlike an exit code.
 */
import { spawnSync } from "node:child_process";

export interface KillCommand {
  command: string;
  args: string[];
  shell: boolean;
}

/** Null on a platform we have no reliable command for — better than a guess. */
export function killPortOwnerCommand(
  platform: string,
  port: number,
): KillCommand | null {
  const p = String(port);
  if (platform === "win32") {
    return {
      command: "powershell",
      args: [
        "-NoProfile",
        "-Command",
        `Get-NetTCPConnection -LocalPort ${p} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`,
      ],
      shell: true,
    };
  }
  if (platform === "darwin" || platform === "linux") {
    return {
      command: "sh",
      args: [
        "-c",
        `pids=$(lsof -ti tcp:${p} -sTCP:LISTEN 2>/dev/null); if [ -n "$pids" ]; then kill -9 $pids; fi`,
      ],
      shell: false,
    };
  }
  return null;
}

/**
 * Run it. Returns whether a command was issued at all — not whether the port
 * is free, which only a probe can answer.
 */
export function killPortOwner(
  port: number,
  platform: string = process.platform,
): boolean {
  // Under a test runner this would end the connector the developer is running,
  // on their own machine, from a suite that only meant to assert a code path.
  // Callers inject their own for this; the interlock is for the ones that
  // forget, and it costs no coverage — the command shape is asserted directly.
  if (process.env["VITEST"] !== undefined) return false;
  const cmd = killPortOwnerCommand(platform, port);
  if (cmd === null) return false;
  try {
    spawnSync(cmd.command, cmd.args, { shell: cmd.shell, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
