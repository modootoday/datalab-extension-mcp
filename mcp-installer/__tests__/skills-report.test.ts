/**
 * Two properties: the report never invents a description it cannot read, and it
 * agrees with the writers about what counts as ours — a status that called a
 * foreign directory installed would invite a user to delete someone else's.
 */
import { describe, expect, it } from "vitest";

import {
  attachSkill,
  detachSkill,
  listSkills,
  skillStatus,
} from "../src/skills-report.js";
import { MARKER_NAME } from "../src/write-dir.js";
import { createMemIo } from "./helpers.js";

const PAYLOAD = "/pkg/skills";
const HOME = "/home/u";
const AGENTS = `${HOME}/.agents/skills`;

const staged = {
  [`${PAYLOAD}/datalab-tone-manner/SKILL.md`]:
    "---\nname: datalab-tone-manner\ndescription: 문체를 분석해 명세서를 쓴다.\n---\n\n# 본문\n",
  [`${PAYLOAD}/datalab-cta-rewrite/SKILL.md`]: "# 프론트매터 없음\n",
};

const ours = (files: string[]) =>
  JSON.stringify({
    source: "@modootoday/datalab-extension-mcp",
    version: "1.8.0",
    installedAt: "2026-08-11T00:00:00.000Z",
    files,
  });

describe("listSkills", () => {
  it("프론트매터의 설명을 읽어 붙인다", async () => {
    const io = createMemIo({ home: HOME, files: staged }).io;
    expect(await listSkills(io, PAYLOAD)).toEqual([
      {
        slug: "datalab-tone-manner",
        description: "문체를 분석해 명세서를 쓴다.",
      },
      { slug: "datalab-cta-rewrite", description: "" },
    ]);
  });

  it("payload 가 없으면 빈 목록이다", async () => {
    const io = createMemIo({ home: HOME }).io;
    expect(await listSkills(io, PAYLOAD)).toEqual([]);
  });
});

describe("skillStatus", () => {
  it("같은 디렉토리를 쓰는 벤더는 한 줄로 묶인다", async () => {
    const io = createMemIo({ home: HOME, files: staged }).io;
    const status = await skillStatus(io, PAYLOAD);
    const shared = status.dirs.find((d) => d.dir === AGENTS);
    expect(shared?.hosts.length).toBeGreaterThan(1);
    expect(status.dirs.filter((d) => d.dir === AGENTS)).toHaveLength(1);
  });

  it("설치된 것과 없는 것을 가른다", async () => {
    const io = createMemIo({
      home: HOME,
      files: {
        ...staged,
        [`${AGENTS}/datalab-tone-manner/SKILL.md`]: "x",
        [`${AGENTS}/datalab-tone-manner/${MARKER_NAME}`]: ours(["SKILL.md"]),
      },
    }).io;
    const dir = (await skillStatus(io, PAYLOAD)).dirs.find(
      (d) => d.dir === AGENTS,
    );
    expect(dir?.ours).toEqual([
      { slug: "datalab-tone-manner", version: "1.8.0" },
    ]);
    expect(dir?.absent).toEqual(["datalab-cta-rewrite"]);
    expect(dir?.refused).toEqual([]);
  });

  it("남의 것은 설치됨으로 세지 않는다", async () => {
    const io = createMemIo({
      home: HOME,
      files: {
        ...staged,
        [`${AGENTS}/datalab-tone-manner/SKILL.md`]: "x",
        [`${AGENTS}/datalab-tone-manner/${MARKER_NAME}`]: JSON.stringify({
          source: "someone-else",
          version: "9",
          installedAt: "",
          files: [],
        }),
        [`${AGENTS}/datalab-cta-rewrite/SKILL.md`]: "x",
      },
    }).io;
    const dir = (await skillStatus(io, PAYLOAD)).dirs.find(
      (d) => d.dir === AGENTS,
    );
    expect(dir?.ours).toEqual([]);
    expect(dir?.refused).toEqual([
      { slug: "datalab-tone-manner", refusal: "foreign" },
      { slug: "datalab-cta-rewrite", refusal: "unmarked" },
    ]);
  });

  it("스킬을 읽지 않는 벤더는 이유와 함께 따로 선다", async () => {
    const io = createMemIo({ home: HOME, files: staged }).io;
    const { unsupported } = await skillStatus(io, PAYLOAD);
    expect(unsupported.length).toBeGreaterThan(0);
    for (const u of unsupported) {
      expect(u.reason).not.toBe("");
    }
  });
});

describe("attachSkill", () => {
  it("이 빌드에 없는 슬러그는 시도하지 않고 목록을 준다", async () => {
    const io = createMemIo({
      home: HOME,
      files: staged,
      cliBins: ["cursor"],
    }).io;
    const out = await attachSkill(io, PAYLOAD, "datalab-nope", "1.8.0");
    expect(out.kind).toBe("unknown-slug");
    if (out.kind === "unknown-slug") {
      expect(out.shipped).toContain("datalab-tone-manner");
    }
  });

  /**
   * The invariant `placeSkills` holds: a host the user does not have is never
   * written to. Attaching must not create an app's directory as a side effect.
   */
  it("감지 안 된 앱의 디렉토리를 만들지 않는다", async () => {
    const mem = createMemIo({ home: HOME, files: staged });
    const out = await attachSkill(
      mem.io,
      PAYLOAD,
      "datalab-tone-manner",
      "1.8.0",
    );
    expect(out).toEqual({ kind: "moved", outcomes: [] });
    expect(await mem.io.exists(`${HOME}/.kiro/skills`)).toBe(false);
    expect(await mem.io.exists(AGENTS)).toBe(false);
  });

  it("감지된 앱에는 한 종만 넣는다", async () => {
    const mem = createMemIo({
      home: HOME,
      files: { ...staged, [`${HOME}/.cursor/mcp.json`]: "{}" },
    });
    const out = await attachSkill(
      mem.io,
      PAYLOAD,
      "datalab-tone-manner",
      "1.8.0",
    );
    expect(out.kind).toBe("moved");
    expect(await mem.io.exists(`${AGENTS}/datalab-tone-manner/SKILL.md`)).toBe(
      true,
    );
    expect(await mem.io.exists(`${AGENTS}/datalab-cta-rewrite`)).toBe(false);
  });

  it("남의 폴더는 덮지 않고 이유를 돌려준다", async () => {
    const mem = createMemIo({
      home: HOME,
      files: {
        ...staged,
        [`${HOME}/.cursor/mcp.json`]: "{}",
        [`${AGENTS}/datalab-tone-manner/SKILL.md`]: "남의 것",
      },
    });
    const out = await attachSkill(
      mem.io,
      PAYLOAD,
      "datalab-tone-manner",
      "1.8.0",
    );
    expect(out.kind === "moved" && out.outcomes[0]?.refusal).toBe("unmarked");
    expect(
      await mem.io.readFile(`${AGENTS}/datalab-tone-manner/SKILL.md`),
    ).toBe("남의 것");
  });
});

describe("detachSkill", () => {
  it("우리가 넣은 것만 뺀다", async () => {
    const mem = createMemIo({
      home: HOME,
      files: { ...staged, [`${HOME}/.cursor/mcp.json`]: "{}" },
    });
    await attachSkill(mem.io, PAYLOAD, "datalab-tone-manner", "1.8.0");
    const out = await detachSkill(mem.io, PAYLOAD, "datalab-tone-manner");
    expect(out.kind === "moved" && out.outcomes[0]?.refusal).toBeUndefined();
    expect(await mem.io.exists(`${AGENTS}/datalab-tone-manner/SKILL.md`)).toBe(
      false,
    );
  });

  it("남의 것은 그대로 두고 이유를 돌려준다", async () => {
    const mem = createMemIo({
      home: HOME,
      files: {
        ...staged,
        [`${HOME}/.cursor/mcp.json`]: "{}",
        [`${AGENTS}/datalab-tone-manner/SKILL.md`]: "남의 것",
        [`${AGENTS}/datalab-tone-manner/${MARKER_NAME}`]: JSON.stringify({
          source: "someone-else",
          version: "9",
          installedAt: "",
          files: ["SKILL.md"],
        }),
      },
    });
    const out = await detachSkill(mem.io, PAYLOAD, "datalab-tone-manner");
    expect(out.kind === "moved" && out.outcomes[0]?.refusal).toBe("foreign");
    expect(
      await mem.io.readFile(`${AGENTS}/datalab-tone-manner/SKILL.md`),
    ).toBe("남의 것");
  });
});

describe("detach 뒤에 남는 것", () => {
  const withCursor = () =>
    createMemIo({
      home: HOME,
      files: { ...staged, [`${HOME}/.cursor/mcp.json`]: "{}" },
    });

  /**
   * The round trip has to close. A leftover shell has no marker, so status
   * reads it as another tool's folder and the next attach refuses it — our own
   * removal would have locked us out.
   */
  it("빈 껍데기를 남기지 않아 다시 넣을 수 있다", async () => {
    const mem = withCursor();
    await attachSkill(mem.io, PAYLOAD, "datalab-tone-manner", "1.8.0");
    await detachSkill(mem.io, PAYLOAD, "datalab-tone-manner");

    expect(await mem.io.exists(`${AGENTS}/datalab-tone-manner`)).toBe(false);
    const again = await attachSkill(
      mem.io,
      PAYLOAD,
      "datalab-tone-manner",
      "1.8.0",
    );
    expect(
      again.kind === "moved" && again.outcomes[0]?.refusal,
    ).toBeUndefined();
  });

  it("사용자가 넣어둔 파일이 있으면 그 폴더는 남긴다", async () => {
    const mem = withCursor();
    await attachSkill(mem.io, PAYLOAD, "datalab-tone-manner", "1.8.0");
    await mem.io.writeFile(`${AGENTS}/datalab-tone-manner/내메모.md`, "내 것");
    await detachSkill(mem.io, PAYLOAD, "datalab-tone-manner");

    expect(
      await mem.io.readFile(`${AGENTS}/datalab-tone-manner/내메모.md`),
    ).toBe("내 것");
  });
});
