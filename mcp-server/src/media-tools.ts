/**
 * The staging tools, answered by the daemon itself.
 *
 * 🔴 Every other tool is the panel's — the daemon forwards and never inspects.
 * These four are the exception because the daemon owns the disk, and that
 * ownership is the whole point of the agreement they implement.
 *
 * 🔴 They therefore work with no browser attached. A run can stage its bytes
 * while the panel is closed and only need it later, for the editor — which is
 * exactly the shape of an unattended job.
 */
import {
  STAGE_CAPABILITY,
  type JobRef,
  type MediaStage,
} from "./media-stage.js";

export const MEDIA_TOOL_NAMES = [
  "media_stage_begin",
  "media_stage_commit",
  "media_stage_status",
  "media_stage_cancel",
] as const;
export type MediaToolName = (typeof MEDIA_TOOL_NAMES)[number];

export function isMediaTool(name: string): name is MediaToolName {
  return (MEDIA_TOOL_NAMES as readonly string[]).includes(name);
}

/** The six identifiers, shared by every call. Callers never send a path. */
const JOB_PROPERTIES = {
  blogId: { type: "string" },
  runId: { type: "string" },
  slot: { type: "string" },
  actionId: { type: "string" },
  fence: { type: "integer", description: "시도 번호. 클수록 새것" },
  jobId: { type: "string", description: "자산 하나의 식별자" },
} as const;
const JOB_REQUIRED = [
  "blogId",
  "runId",
  "slot",
  "actionId",
  "fence",
  "jobId",
] as const;

const schema = (extra: Record<string, unknown> = {}, more: string[] = []) => ({
  type: "object",
  properties: { ...JOB_PROPERTIES, ...extra },
  required: [...JOB_REQUIRED, ...more],
  additionalProperties: false,
});

export function mediaToolDescriptors(): Array<Record<string, unknown>> {
  return [
    {
      name: "media_stage_begin",
      description:
        "이미지를 올릴 자리를 연다. 바이트는 여기로 보내지 않고, 돌려받은 uploadUrl 에 " +
        "uploadToken 을 실어 스트림으로 보낸다. 같은 jobId 로 다시 불러도 자리는 하나다.",
      inputSchema: schema(
        {
          declaredBytes: { type: "integer" },
          declaredMime: { type: "string" },
        },
        ["declaredBytes"],
      ),
    },
    {
      name: "media_stage_commit",
      description:
        "올린 바이트를 검증하고 봉인한다. 받은 것이 알려준 해시·크기와 다르면 봉인하지 " +
        "않는다. 같은 바이트로 다시 부르면 같은 handle 을 돌려준다.",
      inputSchema: schema(
        { sha256: { type: "string" }, bytes: { type: "integer" } },
        ["sha256", "bytes"],
      ),
    },
    {
      name: "media_stage_status",
      description:
        "이 자산이 지금 어떤 상태인지 묻는다. 상태를 확인할 수 없으면 STATE_UNKNOWN 을 " +
        "돌려주며, 그것은 실패가 아니라 모른다는 뜻이다.",
      inputSchema: schema(),
    },
    {
      name: "media_stage_cancel",
      description:
        "자리를 취소한다. 올라오는 중인 스트림이 모두 닫혔음을 확인했을 때만 성공이고, " +
        "확인하지 못하면 STATE_UNKNOWN 이다. 이미 봉인된 것은 취소되지 않는다.",
      inputSchema: schema(),
    },
  ];
}

function jobFrom(args: Record<string, unknown>): JobRef | null {
  const str = (k: string) =>
    typeof args[k] === "string" && args[k] ? (args[k] as string) : null;
  const blogId = str("blogId");
  const runId = str("runId");
  const slot = str("slot");
  const actionId = str("actionId");
  const jobId = str("jobId");
  const fence = args["fence"];
  if (!blogId || !runId || !slot || !actionId || !jobId) return null;
  if (typeof fence !== "number" || !Number.isInteger(fence)) return null;
  return { blogId, runId, slot, actionId, jobId, fence };
}

/**
 * 🔴 Returns a value for every path, including refusals. A throw here would
 * reach the host as a transport failure and hide which of the staging reasons
 * applied — and those reasons are the whole interface.
 */
export async function callMediaTool(
  stage: MediaStage,
  name: MediaToolName,
  args: Record<string, unknown>,
): Promise<unknown> {
  const job = jobFrom(args);
  if (!job) {
    return {
      state: "REFUSED",
      reason: "invalid_args",
      retryable: false,
      message: "여섯 개 식별자가 모두 필요해요.",
      capabilityVersion: STAGE_CAPABILITY,
    };
  }
  switch (name) {
    case "media_stage_begin": {
      const declaredBytes =
        typeof args["declaredBytes"] === "number" ? args["declaredBytes"] : 0;
      return stage.begin({ ...job, declaredBytes });
    }
    case "media_stage_commit": {
      const sha256 = typeof args["sha256"] === "string" ? args["sha256"] : "";
      const bytes = typeof args["bytes"] === "number" ? args["bytes"] : -1;
      return stage.commit({ ...job, sha256, bytes });
    }
    case "media_stage_status":
      return stage.status(job);
    case "media_stage_cancel":
      return stage.cancel(job);
  }
}
