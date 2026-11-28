/** What the loopback routes share: the options and the live panel streams. */
import type { ServerResponse } from "node:http";
import type { Readable } from "node:stream";

import type { Bridge } from "./bridge.js";
import type { ArtifactStore } from "./artifact-store.js";
import type { openLocalImage } from "./local-file.js";
import type { MediaStage } from "./media-stage.js";
import type { AppBook, PairingDesk } from "./pairing/index.js";
import type { PeerOwnerCheck } from "./peer-owner/index.js";

/**
 * Ref-count hooks for the lifecycle owner. The panel stream and each in-flight
 * MCP request are what keep the daemon warm, and the HTTP layer is where they
 * are observable. All optional — a caller wiring only the bridge passes none.
 */
export interface LifecycleHooks {
  /** A connection worth keeping the daemon alive for opened (panel SSE). */
  retain?: () => void;
  /** That connection closed. */
  release?: () => void;
  /** Traffic crossed the daemon; reset the idle debounce even under load. */
  bump?: () => void;
}

export interface HttpBridgeOptions {
  bridge: Bridge;
  port: number;
  /** Must be loopback. Asserted, not assumed. */
  host?: string;
  /** Injected in tests. */
  heartbeatMs?: number;
  /**
   * How long to defer the "catalog emptied" broadcast after a stream drops, so
   * a panel reload (drop then reconnect within milliseconds) does not flap the
   * host's catalog. A reconnect inside this window cancels it.
   */
  toolsChangedDebounceMs?: number;
  /** What /bridge/health reports. */
  identity: { name: string; version: string };
  /** Optional idle-lifecycle wiring. */
  lifecycle?: LifecycleHooks;
  /**
   * Accepts this daemon's takeover secret on /mcp/shutdown and /mcp/authority,
   * alongside the environment token.
   */
  verifyTakeover?: (presented: string) => boolean;
  /** Accepts the single pairing file's key on the /mcp/authority probe only. */
  verifyLegacyKey?: (presented: string) => boolean;
  /**
   * Where staged binaries land. Absent means the daemon accepts no uploads —
   * the endpoint 404s rather than inventing a root, so a build that never wired
   * staging cannot be talked into writing files.
   */
  mediaStage?: MediaStage;
  /**
   * Where editor exports land. Absent means the export route 404s, for the
   * same reason as mediaStage.
   */
  artifactStore?: ArtifactStore;
  /**
   * Diagnostics sink. Shares the daemon's, so anything written here reaches the
   * connector log the user can read.
   */
  log?: (message: string) => void;
  /**
   * Called when a token-authorised shutdown request arrives — an updating
   * adapter asking a stale daemon to step aside so the new version can bind.
   */
  onShutdown?: () => void;
  openLocalImage?: typeof openLocalImage;
  /**
   * Answers the panel about AI apps asking to connect. Absent when a token was
   * given up front: that connector has no per-app approval and the route 404s.
   */
  pairingDesk?: PairingDesk;
  /** The approved apps behind the desk; its presence turns the per-app hold on. */
  apps?: AppBook;
  /** Injected in tests; the default asks the OS which account owns each peer. */
  peerOwner?: PeerOwnerCheck;
}

export interface StreamEntry {
  readonly res: ServerResponse;
  readonly sessionId: string;
  readonly fileStreams: Set<Readable>;
  /**
   * Owned by the entry, not by the module. A timer outliving its stream is a
   * whole class of bug that stops being expressible when removal is the only
   * way to reach the entry the timer lives in.
   */
  readonly heartbeat: NodeJS.Timeout;
}

/** What a route handler may read; the stream map is owned by http.ts. */
export interface HttpContext {
  readonly opts: HttpBridgeOptions;
  readonly streams: ReadonlyMap<string, StreamEntry>;
  /** End every stream and session of one paired profile. */
  readonly endProfile: (digest: string) => void;
}
