_[한국어](./README.md)_

# DataLab Tools Connector

A small free program that connects an AI app like Claude to DataLab Tools. Once connected, you can ask your AI:

> "How did my blog do last week?"

and it answers with the **real numbers** from your Naver blog, keywords, and ads — not guesses. **Lookups just work; editing is asked for.** It never publishes.

**The user guide is at [mcp.datalab.tools](https://mcp.datalab.tools/)** (in Korean, like the extension and the setup helper).

| When                          | See                                                                    |
| ----------------------------- | ---------------------------------------------------------------------- |
| Installing and connecting     | [처음 연결하기 (first connection)](https://mcp.datalab.tools/start/)   |
| The card shows a red sentence | [문제 해결 (troubleshooting)](https://mcp.datalab.tools/troubleshoot/) |
| Which tools there are         | [도구 문서 (tools)](https://mcp.datalab.tools/tools/)                  |
| Ready-made prompts            | [한 줄 프롬프트 (prompts)](https://mcp.datalab.tools/guides/)          |
| Where your data goes          | [개인정보와 안전 (privacy)](https://mcp.datalab.tools/privacy/)        |
| Asking a question             | [커뮤니티 (community)](https://mcp.datalab.tools/community/)           |

## Quick install

You need the DataLab Tools extension in your browser, an AI app installed on your computer, and Node.js 22 or later.

1. In the extension settings, turn on **다른 AI 앱에 연결 (MCP)** (connect other AI apps).
2. Paste this into a terminal. It finds the AI apps on your computer and registers them in one go.

   ```
   npx -y @modootoday/datalab-extension-mcp@1.18.4 install
   ```

3. Fully quit and reopen the AI app, then press **[허용하기]** (allow) in the side panel.

If you'd rather not use a terminal, paste this into an AI app that can run commands (Claude Code, Codex, Gemini CLI and the like). It is in Korean on purpose; the app follows it either way.

```
데이터랩툴즈 연결 프로그램을 설치하고 이 앱에 등록해 줘.
1. node --version 으로 Node.js 22 이상인지 확인해. 없거나 낮으면 설치 방법만 알려 주고 멈춰.
2. npm install -g @modootoday/datalab-extension-mcp@1.18.4 을 실행해.
3. 이 앱의 MCP 설정에 datalab-extension-mcp 라는 이름으로 서버를 추가해.
   명령은 전역 설치된 datalab-extension-mcp 이고, Windows 에서는 cmd /c datalab-extension-mcp 야.
   npx 는 쓰지 말고, 키나 환경 변수는 넣지 마.
4. 끝나면 이 앱을 완전히 종료했다가 다시 켜라고 알려 줘.
```

_(Install the DataLab Tools connector and register it with this app: check Node.js 22 or later and stop with install advice if missing; run the pinned global install; add a server named datalab-extension-mcp that runs the global bin, through cmd /c on Windows, never npx, with no key or environment variables; then ask me to fully restart the app.)_

To remove it, run `npx -y @modootoday/datalab-extension-mcp@1.18.4 uninstall` and turn MCP off in the extension settings.

On a shared computer, the connector refuses programs running under other accounts on it. A program running under your own account, or a browser extension you installed, can still connect as a browser, so install only ones you trust.

## Developer appendix

<details>
<summary>Technical summary for source verification / integration</summary>

- Repo: <https://github.com/modootoday/datalab-extension-mcp>
- npm: <https://www.npmjs.com/package/@modootoday/datalab-extension-mcp>

**Environment variables**

| Variable                   | Required | Default     | Description                                                    |
| -------------------------- | -------- | ----------- | -------------------------------------------------------------- |
| `DATALAB_MCP_TOKEN`        | optional | —           | A fixed token. Without one the connector pairs with the panel. |
| `DATALAB_MCP_EXTENSION_ID` | optional | store build | The extension ID allowed to connect.                           |
| `DATALAB_MCP_PORT`         | optional | `8765`      | Listen port.                                                   |
| `DATALAB_MCP_HOST`         | optional | `127.0.0.1` | Bind address. Non-loopback values are rejected.                |

**Rate limit** — `300` calls of burst per connector, refilling at `50` per second. Browsers connected to the same connector **share that budget**. It damps runaway loops rather than enforcing billing, so ordinary use never reaches it.

**Failure responses** — a failed tool call arrives as an `isError` result rather than a protocol error, and its body is JSON like a success (`ok` / `reason` / `message` / `retryable`, plus `retryAfterMs` when waiting helps). Canonical list of every failure code and whether it is worth retrying: <https://github.com/modootoday/datalab-extension-mcp/blob/main/mcp-core/src/errors.ts>

**Architecture** — the connector is a relay with no credentials and no egress. The tool list is served by the extension; the canonical catalog is the store-reviewed extension code. Transport is loopback HTTP+SSE with dual auth (Origin check + token check), and the allowlist — both the read-only half and the tier table that gates every write — is enforced by the extension. Canonical allowlist (with per-item exclusion reasons): <https://github.com/modootoday/datalab-extension-mcp/blob/main/mcp-core/src/allowlist.ts>

**Supply chain** — the public repo is the entire source. npm publishing uses OIDC trusted publishing + provenance, with no long-lived token (`npm audit signatures` verifies). Install configuration records an exact bootstrap version, and canonical promotion uses the same attested npm package path.

**License** — MIT ([LICENSE](./LICENSE)).

</details>
