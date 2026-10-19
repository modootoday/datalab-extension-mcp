import { describe, expect, it } from "vitest";
import {
  MCP_IMAGES_KEY,
  MCP_IMAGES_MAX,
  splitResultImages,
} from "./result-images.js";

const jpeg = { mimeType: "image/jpeg", data: "QUJD" };

describe("splitResultImages", () => {
  it("lifts images nested under data and removes the key", () => {
    const out = splitResultImages({
      availability: "ok",
      data: { width: 10, [MCP_IMAGES_KEY]: [jpeg] },
    });
    expect(out.images).toEqual([
      { type: "image", data: "QUJD", mimeType: "image/jpeg" },
    ]);
    expect(out.result).toEqual({ availability: "ok", data: { width: 10 } });
  });

  it("drops malformed entries and a non-array value", () => {
    const out = splitResultImages({
      a: { [MCP_IMAGES_KEY]: "nope" },
      b: {
        [MCP_IMAGES_KEY]: [
          null,
          { mimeType: "image/gif", data: "QUJD" },
          { mimeType: "image/png", data: "not base64!" },
          { mimeType: "image/png", data: "" },
          { mimeType: "image/png" },
        ],
      },
    });
    expect(out.images).toEqual([]);
    expect(out.result).toEqual({ a: {}, b: {} });
  });

  it("caps the number of images", () => {
    const many = Array.from({ length: MCP_IMAGES_MAX + 2 }, () => jpeg);
    expect(splitResultImages({ [MCP_IMAGES_KEY]: many }).images).toHaveLength(
      MCP_IMAGES_MAX,
    );
  });

  it("walks arrays and leaves scalars and deep values alone", () => {
    const deep = {
      l1: { l2: { l3: { l4: { l5: { [MCP_IMAGES_KEY]: [jpeg] } } } } },
    };
    const out = splitResultImages([1, "x", null, deep]);
    expect(out.images).toEqual([]);
    expect(out.result).toEqual([1, "x", null, deep]);
    expect(splitResultImages("plain")).toEqual({ result: "plain", images: [] });
  });
});
