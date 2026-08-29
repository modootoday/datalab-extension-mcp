import { mkdir, mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { runDaemon } from "../src/daemon.js";
import { logDir } from "../src/log-file.js";
import { REQUIRED_BROWSER_CAPABILITIES } from "@modootoday/extension-app-mcp-core";

/**
 * Booting the daemon writes to a directory. Left unnamed that is the
 * operator's own, so a test that boots one reads and writes real state and
 * what it finds there depends on the machine it runs on.
 */
const ENV = {
  DATALAB_MCP_TOKEN: "t".repeat(64),
  DATALAB_MCP_EXTENSION_ID: "a".repeat(32),
  // A port of its own: the daemon takes it as a singleton lock, and losing that
  // race to a sister run — or to the operator's real connector on the default —
  // would read as the boot having failed.
  DATALAB_MCP_PORT: String(40000 + (process.pid % 20000)),
};
let running: { http: { close: () => Promise<void> } } | null = null;
let home = "";

afterEach(async () => {
  await running?.http.close();
  running = null;
  if (home) await rm(home, { recursive: true, force: true });
  home = "";
});

describe("데몬이 자기 상태를 두는 곳", () => {
  it("준 홈 아래에만 쓴다", async () => {
    home = await mkdtemp(join(tmpdir(), "daemon-home-"));
    running = runDaemon(ENV, { home, log: () => {}, exit: () => {} })!;
    expect(running).not.toBeNull();

    // The root is chosen lazily, so booting alone proves nothing about it.
    // Only a real write says which directory the daemon actually picked.
    const res = await fetch(`http://127.0.0.1:${ENV.DATALAB_MCP_PORT}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "media_stage_begin",
          arguments: {
            blogId: "b",
            runId: "r",
            slot: "s",
            actionId: "a",
            fence: 1,
            jobId: "j",
            declaredBytes: 4,
          },
        },
      }),
    });
    expect(res.status).toBe(200);
    expect(await readdir(join(home, ".datalab-mcp", "media"))).toContain(
      "ledger",
    );
  });

  // A seam that silently changed the default would move every operator's
  // state on upgrade, and nothing else in this suite would notice.
  it("주지 않으면 오늘과 같은 경로다", () => {
    expect(logDir()).toBe(join(homedir(), ".datalab-mcp"));
  });
});

/**
 * One key per machine, and each browser its own slot. This boots the real
 * daemon and asks the question the whole credential model turns on: do two
 * browsers holding the same pairing token get two sessions, not one shared.
 */
describe("같은 키를 든 브라우저들이 각자 붙는가", () => {
  // A port of its own: the singleton lock is held for the life of a daemon, and
  // reusing the one above would make this read as a boot that failed.
  const ATTACH_ENV = {
    ...ENV,
    DATALAB_MCP_PORT: String(Number(ENV.DATALAB_MCP_PORT) + 1),
  };

  const hello = (browserId: string, browserLabel?: string): string =>
    JSON.stringify({
      t: "hello",
      protocolVersions: [1],
      extensionVersion: "1.1.32",
      token: ENV.DATALAB_MCP_TOKEN,
      extensionId: ENV.DATALAB_MCP_EXTENSION_ID,
      browserId,
      ...(browserLabel === undefined ? {} : { browserLabel }),
      capabilities: [...REQUIRED_BROWSER_CAPABILITIES],
    });

  const shake = async (
    browserId: string,
    browserLabel?: string,
  ): Promise<{ t: string; sessionId?: string; reason?: string }> =>
    fetch(`http://127.0.0.1:${ATTACH_ENV.DATALAB_MCP_PORT}/bridge/hello`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: hello(browserId, browserLabel),
    }).then(
      (res) =>
        res.json() as Promise<{
          t: string;
          sessionId?: string;
          reason?: string;
        }>,
    );

  const openStream = async (sessionId: string): Promise<Response> =>
    fetch(
      `http://127.0.0.1:${ATTACH_ENV.DATALAB_MCP_PORT}/bridge/events?session=${sessionId}`,
      {
        headers: {
          origin: `chrome-extension://${ENV.DATALAB_MCP_EXTENSION_ID}`,
          authorization: `Bearer ${ENV.DATALAB_MCP_TOKEN}`,
        },
      },
    );

  const boot = async (): Promise<void> => {
    home = await mkdtemp(join(tmpdir(), "daemon-attach-"));
    await mkdir(join(home, ".datalab-mcp"), { recursive: true });
    running = runDaemon(ATTACH_ENV, {
      home,
      log: () => {},
      exit: () => {},
      // The HTTP client holds a stream until something is written to it, so at
      // the real interval this would wait out the whole test rather than read.
      heartbeatMs: 25,
    })!;
    expect(running).not.toBeNull();
  };

  it("두 브라우저가 같은 키로 각자의 슬롯을 받는다", async () => {
    await boot();

    const a = await shake("brw-a", "업무용");
    const b = await shake("brw-b", "미나고");
    expect(a.t).toBe("hello_ack");
    expect(b.t).toBe("hello_ack");
    expect(a.sessionId).not.toBe(b.sessionId);

    const streamA = await openStream(a.sessionId!);
    const streamB = await openStream(b.sessionId!);
    expect(streamA.status).toBe(200);
    expect(streamB.status).toBe(200);

    const rpc = (await fetch(
      `http://127.0.0.1:${ATTACH_ENV.DATALAB_MCP_PORT}/mcp`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 9,
          method: "tools/call",
          params: { name: "datalab_browsers", arguments: {} },
        }),
      },
    ).then((res) => res.json())) as {
      result: { content: Array<{ text: string }> };
    };
    // Self-reported names, and nothing else: with one key per machine there is
    // no registration row left to carry a label or a status.
    expect(JSON.parse(rpc.result.content[0]!.text)).toEqual({
      browsers: [
        { id: "brw-a", name: "업무용", primary: true },
        { id: "brw-b", name: "미나고", primary: false },
      ],
    });

    await streamA.body?.cancel();
    await streamB.body?.cancel();
  });

  it("키가 틀리면 붙지 못한다", async () => {
    await boot();
    const refused = await fetch(
      `http://127.0.0.1:${ATTACH_ENV.DATALAB_MCP_PORT}/bridge/hello`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          t: "hello",
          protocolVersions: [1],
          extensionVersion: "1.1.32",
          token: "z".repeat(64),
          extensionId: ENV.DATALAB_MCP_EXTENSION_ID,
          browserId: "brw-c",
          capabilities: [...REQUIRED_BROWSER_CAPABILITIES],
        }),
      },
    ).then((res) => res.json());
    expect(refused).toMatchObject({ t: "hello_nack", reason: "unauthorized" });
  });

  // A handshake that names nothing cannot be addressed by datalab_browsers, so
  // admitting it would put a session where no call could ever land.
  it("이름 없는 악수는 받지 않는다", async () => {
    await boot();
    const nameless = await fetch(
      `http://127.0.0.1:${ATTACH_ENV.DATALAB_MCP_PORT}/bridge/hello`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          t: "hello",
          protocolVersions: [1],
          extensionVersion: "1.1.32",
          token: ENV.DATALAB_MCP_TOKEN,
          extensionId: ENV.DATALAB_MCP_EXTENSION_ID,
          capabilities: [...REQUIRED_BROWSER_CAPABILITIES],
        }),
      },
    ).then((res) => res.json());
    expect(nameless).toMatchObject({ t: "hello_nack", reason: "unauthorized" });
  });
});
