/**
 * 🔴 The connector needs somewhere to speak and must not fill the disk doing
 * it, so these cover the two harms a log file introduces: unbounded growth,
 * and an unwritable location taking the connector down with it. Real files in
 * a temp directory, because the behaviour under test is what the filesystem
 * does — stubbing it would leave the assertions testing the stub.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  LOG_MAX_BYTES,
  appendLogLine,
  logDir,
  logPath,
  openLogFd,
  rollIfLarge,
  rolledLogPath,
} from "../src/log-file.js";
import { closeSync, existsSync } from "node:fs";

let home: string;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "connector-log-"));
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
});

describe("커넥터 로그", () => {
  it("검사 대상을 실제로 찾았다", () => {
    expect(logPath(home).startsWith(home)).toBe(true);
    expect(rolledLogPath(home)).not.toBe(logPath(home));
  });

  it("디렉터리가 없어도 쓴다", () => {
    expect(existsSync(logDir(home))).toBe(false);
    appendLogLine("first line", home);
    expect(readFileSync(logPath(home), "utf8")).toContain("first line");
  });

  it("줄마다 시각이 붙는다 — 언제 일어났는지가 절반이다", () => {
    appendLogLine("something happened", home);
    const text = readFileSync(logPath(home), "utf8");
    expect(text).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("이어 쓴다 — 앞선 기록을 덮지 않는다", () => {
    appendLogLine("one", home);
    appendLogLine("two", home);
    const text = readFileSync(logPath(home), "utf8");
    expect(text).toContain("one");
    expect(text).toContain("two");
  });

  it("🔴 상한을 넘으면 넘긴다 — 사용자 디스크를 채우지 않는다", () => {
    mkdirSync(logDir(home), { recursive: true });
    writeFileSync(logPath(home), "x".repeat(LOG_MAX_BYTES + 1));
    expect(rollIfLarge(home)).toBe(true);
    expect(existsSync(rolledLogPath(home))).toBe(true);
    expect(existsSync(logPath(home))).toBe(false);
  });

  it("상한 아래면 그대로 둔다", () => {
    appendLogLine("small", home);
    expect(rollIfLarge(home)).toBe(false);
    expect(existsSync(rolledLogPath(home))).toBe(false);
  });

  it("🔴 파일은 두 개를 넘지 않는다 — 여러 번 넘겨도", () => {
    for (let i = 0; i < 4; i += 1) {
      mkdirSync(logDir(home), { recursive: true });
      writeFileSync(logPath(home), "x".repeat(LOG_MAX_BYTES + 1));
      rollIfLarge(home);
    }
    // 🔴 The current file plus the previous one. More generations than that
    // would make the size cap meaningless.
    expect(existsSync(rolledLogPath(home))).toBe(true);
    expect(existsSync(`${rolledLogPath(home)}.1`)).toBe(false);
  });

  it("넘긴 뒤에도 이어서 쓸 수 있다", () => {
    mkdirSync(logDir(home), { recursive: true });
    writeFileSync(logPath(home), "x".repeat(LOG_MAX_BYTES + 1));
    appendLogLine("after the roll", home);
    const text = readFileSync(logPath(home), "utf8");
    expect(text).toContain("after the roll");
    expect(statSync(logPath(home)).size).toBeLessThan(LOG_MAX_BYTES);
  });

  it("자식에게 넘길 수 있는 핸들을 연다", () => {
    const fd = openLogFd(home);
    expect(fd).not.toBeNull();
    closeSync(fd!);
  });

  it("🔴 쓸 수 없는 곳이면 조용히 포기한다 — 기록 때문에 커넥터가 죽지 않는다", () => {
    // Creating a directory over an existing file fails.
    const blocked = join(home, "blocked");
    writeFileSync(blocked, "not a directory");
    expect(openLogFd(join(blocked, "under"))).toBeNull();
    expect(() =>
      appendLogLine("dropped", join(blocked, "under")),
    ).not.toThrow();
  });
});
