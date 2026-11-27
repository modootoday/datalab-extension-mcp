# mcp-server — where to start

The daemon: one background process that owns the loopback port and the panel connection, and
serves many MCP clients over one stateless HTTP route. Every tool is the panel's; the daemon
forwards and never inspects, except for the staging tools it answers itself. `serve.ts` is the
process entry an adapter spawns; `index.ts` is the surface.

## The process

| File            | What                                                                       |
| --------------- | -------------------------------------------------------------------------- |
| `daemon.ts`     | the entry that wires the modules below and adds only their glue            |
| `config.ts`     | configuration resolved purely; the published extension id is the default   |
| `pairing/`      | the root credential, handshake refusals, the approved AI apps, the desk    |
| `singleton.ts`  | one daemon per machine: the TCP bind is the lock                           |
| `owner-file/`   | writes private state files readable by the local user alone                |
| `takeover.ts`   | the proof a local adapter presents to retire a running daemon              |
| `port-owner.ts` | the last resort: ending whatever else holds the port                       |
| `lifecycle.ts`  | ref-count plus idle timeout; at zero the daemon closes the panel and exits |
| `log-file.ts`   | where the detached daemon writes what it is doing                          |

## HTTP

| File                    | What                                                                |
| ----------------------- | ------------------------------------------------------------------- |
| `http.ts`               | the loopback transport for browser sessions and MCP hosts           |
| `http-io.ts`            | body limits and reading for the route the extension answers through |
| `http-context.ts`       | the ref-count hooks the lifecycle owner observes                    |
| `mcp-http.ts`           | the `/mcp` JSON-RPC route and the reserved error codes it raises    |
| `route-mcp-app-gate.ts` | holds a tool call from an AI app the user has not approved          |
| `route-pairing.ts`      | the route the panel uses to see and answer which AI apps ask        |
| `mcp-observation.ts`    | counts who calls `/mcp`; it never refuses                           |
| `token-digest.ts`       | the one place a token becomes the digest the registry stores        |

## The bridge to the panel

| File         | What                                                                       |
| ------------ | -------------------------------------------------------------------------- |
| `bridge.ts`  | the bridge protocol and browser-session correlation, with the rate bucket  |
| `pending.ts` | request correlation: a host asks synchronously, the panel answers a stream |

## Files and media

| File                    | What                                                                   |
| ----------------------- | ---------------------------------------------------------------------- |
| `media-stage.ts`        | receives a binary made elsewhere and seals it                          |
| `media-tools.ts`        | the staging tools the daemon answers itself                            |
| `route-media-upload.ts` | the one route that takes bytes, streamed under a one-time upload token |
| `route-stage-range.ts`  | reads a sealed stage asset a range at a time under its grant           |
| `route-bridge-file.ts`  | lets the extension read one local image a browser cannot open          |
| `local-file.ts`         | decides a file's type from its leading bytes                           |
| `artifact-store.ts`     | stores the files an editor export hands back to the host               |
| `route-artifact.ts`     | the route the panel uses to hand back an export, chunk by chunk        |
