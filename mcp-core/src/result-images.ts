/**
 * Images inside a tool result, lifted into MCP image content blocks.
 *
 * A panel tool puts {mimeType, data} entries under this key; the daemon takes
 * them out of the JSON text so a host receives real images, not base64 text.
 */

export const MCP_IMAGES_KEY = "__mcpImages";

/** Keeps one result inside the daemon's result body budget. */
export const MCP_IMAGES_MAX = 4;

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const SEARCH_DEPTH = 4;

export interface McpImageContent {
  type: "image";
  data: string;
  mimeType: string;
}

function asImage(value: unknown): McpImageContent | null {
  if (typeof value !== "object" || value === null) return null;
  const { mimeType, data } = value as { mimeType?: unknown; data?: unknown };
  if (typeof mimeType !== "string" || !IMAGE_MIME.has(mimeType)) return null;
  if (typeof data !== "string" || data.length === 0 || !BASE64.test(data)) {
    return null;
  }
  return { type: "image", data, mimeType };
}

function strip(
  value: unknown,
  depth: number,
  images: McpImageContent[],
): unknown {
  if (depth > SEARCH_DEPTH) return value;
  if (Array.isArray(value)) {
    return value.map((item) => strip(item, depth + 1, images));
  }
  if (typeof value !== "object" || value === null) return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key !== MCP_IMAGES_KEY) {
      out[key] = strip(item, depth + 1, images);
      continue;
    }
    if (!Array.isArray(item)) continue;
    for (const entry of item) {
      const image = asImage(entry);
      if (image && images.length < MCP_IMAGES_MAX) images.push(image);
    }
  }
  return out;
}

/** Split a result into its JSON remainder and the images it carried. */
export function splitResultImages(result: unknown): {
  result: unknown;
  images: McpImageContent[];
} {
  const images: McpImageContent[] = [];
  const rest = strip(result, 0, images);
  return { result: rest, images };
}
