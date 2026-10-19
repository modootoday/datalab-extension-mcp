import { describe, expect, it } from "vitest";
import { MAX_FILE_BYTES, openStagedImage } from "../src/local-file.js";

const HANDLE = `stage:${"a".repeat(32)}`;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]);

const stageOf = (bytes: Buffer | Error) => ({
  readSealed: async () => {
    if (bytes instanceof Error) throw bytes;
    return bytes;
  },
});

async function read(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const parts: Buffer[] = [];
  for await (const part of stream) parts.push(Buffer.from(part as Buffer));
  return Buffer.concat(parts);
}

describe("openStagedImage", () => {
  it("opens a sealed image under the same rules as a local file", async () => {
    const out = await openStagedImage(stageOf(PNG), HANDLE);
    expect(out).toMatchObject({
      ok: true,
      contentType: "image/png",
      byteLength: PNG.length,
    });
    if (!out.ok) throw new Error("not ok");
    expect(await read(out.stream)).toEqual(PNG);
    expect(out.fileName).toBe("aaaaaaaa.png");
  });

  it.each([
    ["no stage", undefined, HANDLE, "not_found"],
    ["a malformed handle", stageOf(PNG), "stage:../x", "not_found"],
    ["a missing blob", stageOf(new Error("ENOENT")), HANDLE, "not_found"],
    ["an empty blob", stageOf(Buffer.alloc(0)), HANDLE, "empty"],
    [
      "a non-image",
      stageOf(Buffer.from("hello world, not a picture")),
      HANDLE,
      "not_an_image",
    ],
    [
      "an oversized blob",
      stageOf(Buffer.alloc(MAX_FILE_BYTES + 1)),
      HANDLE,
      "too_large",
    ],
  ])("refuses %s", async (_label, stage, handle, reason) => {
    expect(await openStagedImage(stage, handle)).toMatchObject({
      ok: false,
      reason,
    });
  });
});
