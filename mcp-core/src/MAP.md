# mcp-core — where to start

The transport-free half of the bridge, imported by both ends: the local MCP server and the
extension side panel. A wire contract holds only if one definition of it exists, so nothing here
imports a transport, React or a Node built-in. `index.ts` is the surface; import from it.

## The wire

| File           | What                                                                            |
| -------------- | ------------------------------------------------------------------------------- |
| `protocol.ts`  | the messages the server and the panel exchange over the SSE stream and its POST |
| `negotiate.ts` | version negotiation at handshake, refusing a mismatch with a structured reason  |
| `version.ts`   | semver comparison, stated once                                                  |
| `identity.ts`  | the connector's health name and where it lives, for every surface               |
| `deadlines.ts` | how long a request lives and how much of it a confirmation may take             |
| `reconnect.ts` | connection state and the reconnect policy for a peer that is often not running  |

## Trust

| File              | What                                                                 |
| ----------------- | -------------------------------------------------------------------- |
| `auth.ts`         | handshake authorisation: who may open a session                      |
| `credential.ts`   | which credential a handshake presented, decided once                 |
| `pairing-wire.ts` | the pairing desk's route: which AI app asks, and the panel's answer  |
| `allowlist.ts`    | the closed tool enum and the tier that decides how the user is asked |
| `annotations.ts`  | the tier restated as the tool annotations a host reads               |

## Tools and results

| File               | What                                                                    |
| ------------------ | ----------------------------------------------------------------------- |
| `tools.ts`         | projects a bridge descriptor to an MCP tool; the server authors none    |
| `toolsets.ts`      | groups tools by the job a person is doing, handed over as a tool result |
| `discovery.ts`     | the stable discovery tools a host sees before the panel connects        |
| `result-images.ts` | lifts images in a tool result into MCP image content blocks             |
| `errors.ts`        | the published failure codes and their retry policy                      |
| `messages.ts`      | frozen user-facing strings; a pinned server shows them for years        |

## Note on reading this directory

`errors.ts`, `messages.ts` and `protocol.ts` are published contracts: a released server keeps
reading them unchanged, so change them only additively.
