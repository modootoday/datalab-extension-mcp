import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  appsPath,
  createAppBook,
  createPairingDesk,
  pairingRoot,
  readApprovedApps,
  readPairingRecord,
  type AppBook,
  type PairingDesk,
} from "../src/pairing/index.js";
import { gateMcpApp } from "../src/route-mcp-app-gate.js";

const EXT_ID = "abcdefghijklmnopabcdefghijklmnop";
const ORIGIN = `chrome-extension://${EXT_ID}`;
const MINE = "a".repeat(64);
const OTHER = "b".repeat(64);

let home: string;
let now: number;
let apps: AppBook;
let desk: PairingDesk;

function build(): void {
  const root = pairingRoot({ home, now: () => now });
  apps = createAppBook({ home, now: () => now });
  desk = createPairingDesk({ root, apps, extensionIds: [EXT_ID] });
}

const ask = (
  action: string,
  token: string,
  app?: string,
  origin: string | undefined = ORIGIN,
) => desk.handle({ action, token, app }, origin);

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "datalab-desk-"));
  now = 1_000;
  build();
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
});

describe("a pending claim", () => {
  it("lists the app that asked while the window is open", () => {
    apps.see("Claude Desktop");
    const reply = ask("status", MINE);
    expect(reply.answer).toMatchObject({
      ok: true,
      status: {
        paired: false,
        windowOpen: true,
        pending: [{ name: "Claude Desktop" }],
      },
    });
  });

  it("approving pairs with the panel token and remembers the app", () => {
    apps.see("Claude Desktop");
    const reply = ask("approve", MINE, "Claude Desktop");
    expect(reply.status).toBe(200);
    expect(readPairingRecord(home)?.token).toBe(MINE);
    expect(readApprovedApps(home).map((app) => app.name)).toEqual([
      "Claude Desktop",
    ]);
  });

  it("refusing holds the app and approves nothing", () => {
    apps.see("Claude Desktop");
    expect(ask("refuse", MINE, "Claude Desktop").status).toBe(200);
    expect(readApprovedApps(home)).toEqual([]);
    expect(apps.see("Claude Desktop")).toBe("refused");
  });

  it("can be approved hours after start, and the window older panels read stays open", () => {
    apps.see("Claude Desktop");
    now += 6 * 60 * 60 * 1000;
    expect(ask("approve", MINE, "Claude Desktop").status).toBe(200);
    expect(ask("status", MINE).answer).toMatchObject({
      status: { windowOpen: true, windowEndsAt: null },
    });
  });

  it("refuses an app that never asked", () => {
    expect(ask("approve", MINE, "Ghost").answer).toEqual({
      ok: false,
      reason: "unknown_app",
    });
  });

  it("refuses a token too short to pair with", () => {
    apps.see("Claude Desktop");
    expect(ask("approve", "short", "Claude Desktop").answer).toEqual({
      ok: false,
      reason: "unauthorized",
    });
  });
});

describe("a second profile", () => {
  beforeEach(() => {
    apps.see("Claude Desktop");
    ask("approve", MINE, "Claude Desktop");
  });

  it("sees nothing before it pairs, then shares the machine's approvals", () => {
    expect(ask("status", OTHER).answer).toMatchObject({
      ok: true,
      status: { paired: true, yours: false, pending: [], apps: [] },
    });
    apps.see("Cursor");
    expect(ask("approve", OTHER, "Cursor").status).toBe(200);
    expect(ask("status", OTHER).answer).toMatchObject({
      status: {
        yours: true,
        apps: [{ name: "Claude Desktop" }, { name: "Cursor" }],
      },
    });
    expect(readPairingRecord(home)?.token).toBe(MINE);
  });

  it("may revoke an app approved in another profile, since approval is per machine", () => {
    expect(ask("revoke", OTHER, "Claude Desktop").status).toBe(200);
    expect(readApprovedApps(home)).toHaveLength(0);
  });
});

describe("the connected apps", () => {
  beforeEach(() => {
    apps.see("Claude Desktop");
    ask("approve", MINE, "Claude Desktop");
  });

  it("lists approved apps for the paired panel", () => {
    expect(ask("status", MINE).answer).toMatchObject({
      status: { paired: true, yours: true, apps: [{ name: "Claude Desktop" }] },
    });
  });

  it("revoking removes the app and it is asked again on its next call", () => {
    expect(ask("revoke", MINE, "Claude Desktop").status).toBe(200);
    expect(readApprovedApps(home)).toEqual([]);
    expect(apps.see("Claude Desktop")).toBe("pending");
  });

  it("revoking an app that is not connected is refused", () => {
    expect(ask("revoke", MINE, "Ghost").answer).toEqual({
      ok: false,
      reason: "unknown_app",
    });
  });

  it("keeps the approval across a restart", () => {
    build();
    expect(apps.see("Claude Desktop")).toBe("approved");
  });

  it.skipIf(process.platform === "win32")("stores the list owner-only", () => {
    expect(statSync(appsPath(home)).mode & 0o777).toBe(0o600);
  });
});

describe("who may ask", () => {
  it("a web page cannot ask: a foreign or opaque Origin is refused", () => {
    apps.see("Claude Desktop");
    for (const origin of ["https://example.com", "null"]) {
      expect(ask("approve", MINE, "Claude Desktop", origin).answer).toEqual({
        ok: false,
        reason: "forbidden_origin",
      });
    }
    expect(readPairingRecord(home)).toBeNull();
  });

  it("a caller with no Origin is identified by the extension id", () => {
    const wrong = desk.handle(
      { action: "status", token: MINE, extensionId: "someoneelse" },
      undefined,
    );
    expect(wrong.status).toBe(403);
    const right = desk.handle(
      { action: "status", token: MINE, extensionId: EXT_ID },
      undefined,
    );
    expect(right.status).toBe(200);
  });

  it("refuses a malformed request", () => {
    expect(desk.handle({ action: "pair" }, ORIGIN).status).toBe(400);
  });
});

describe("the per-app hold", () => {
  const call = { jsonrpc: "2.0", id: 7, method: "tools/call" };

  it("holds a tool call from an unapproved app and notes it for the panel", () => {
    const held = gateMcpApp(apps, "Claude Desktop", call, undefined);
    expect(held?.body).toContain("waiting for approval");
    expect(apps.pending().map((app) => app.name)).toEqual(["Claude Desktop"]);
  });

  it("lets a tool call through after approval and holds it again after revoke", () => {
    apps.see("Claude Desktop");
    ask("approve", MINE, "Claude Desktop");
    expect(gateMcpApp(apps, "Claude Desktop", call, undefined)).toBeNull();
    ask("revoke", MINE, "Claude Desktop");
    expect(gateMcpApp(apps, "Claude Desktop", call, undefined)).not.toBeNull();
  });

  it("serves every paired profile after one approval, and shows it to each", () => {
    expect(ask("approve", OTHER, "Claude Desktop").answer).toEqual({
      ok: false,
      reason: "unknown_app",
    });
    apps.see("Claude Desktop");
    ask("approve", MINE, "Claude Desktop");
    expect(gateMcpApp(apps, "Claude Desktop", call, undefined)).toBeNull();
    expect(ask("status", OTHER).answer).toMatchObject({
      ok: true,
      status: { yours: true, apps: [{ name: "Claude Desktop" }] },
    });
  });

  it("says a refused app was refused", () => {
    apps.see("Claude Desktop");
    ask("refuse", MINE, "Claude Desktop");
    const held = gateMcpApp(apps, "Claude Desktop", call, undefined);
    expect(held?.body).toContain("refused");
  });

  it("does not hold listing, nor a call that names no app", () => {
    const list = { jsonrpc: "2.0", id: 1, method: "tools/list" };
    expect(gateMcpApp(apps, "Claude Desktop", list, undefined)).toBeNull();
    expect(gateMcpApp(apps, undefined, call, undefined)).toBeNull();
    expect(gateMcpApp(undefined, "Claude Desktop", call, undefined)).toBeNull();
  });
});
