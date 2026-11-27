_[한국어](./README.md)_

# DataLab Tools Connector

A small free program that connects an AI app like Claude to DataLab Tools. Once connected, you can ask your AI:

> "How did my blog do last week?"

and it answers with the **real numbers** from your Naver blog, keywords, and ads — not guesses. **Lookups just work; editing is asked for** — changing your draft or an editor is confirmed every time, and it never publishes. A first-timer is usually done in about 10 minutes.

> The extension UI and the setup helper speak Korean; this page mirrors the Korean README ([한국어](./README.md)) for reference. The exact sentences you'll see on screen are shown in Korean below, with an English gloss.

## What you need

Set this up once per computer.

| Need                                 | How                                                                                                                                                                                                                                                                                |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chrome + the DataLab Tools extension | If you don't have it yet, install from [app.datalab.tools](https://app.datalab.tools/).                                                                                                                                                                                            |
| An AI app                            | The program that answers your questions. It must be an **app installed on your computer** (websites won't work). Claude Desktop is free at [claude.ai](https://claude.ai/download); ChatGPT works as the **desktop app only**, from [openai.com](https://openai.com/).             |
| Node.js                              | The free program that runs the connector. Get it from [nodejs.org](https://nodejs.org/) via the **LTS** button. On Windows, `winget install OpenJS.NodeJS.LTS` also installs it. On Mac and Linux, the one-liner in [Step 2](#step-2--install) installs Node.js for you in one go. |

> A work computer may block installs by policy. Check with your IT team first to avoid wasting time.

## Three steps

No connection key is needed. The first time an app connects, you allow it once in the side panel.

| Step              | What                                                     | Where              |
| ----------------- | -------------------------------------------------------- | ------------------ |
| **1. Turn it on** | Flip a switch and copy the install command               | Extension settings |
| **2. Install**    | Run the command, or hand the install to your AI app      | Terminal           |
| **3. Allow**      | Restart the AI app and press **[허용하기]** in the panel | Extension          |

Feel free to read [Safety](#safety) first if you'd like reassurance before starting.

## Step 1 — Turn it on

1. Click the DataLab Tools icon at Chrome's top-right to open the **side panel**. (If you don't see it, find it under the puzzle-piece icon.)
2. Press **설정** (Settings) at the bottom of the panel to open the **extension settings** screen.
3. Turn on the **"다른 AI 앱에 연결 (MCP)"** (Connect to another AI app) switch. A consent screen appears — read it and agree.

   > "연결된 AI 앱이 요청하면 네이버 데이터가 해당 앱과 그 AI 제공사 서버로 전달돼요."
   >
   > _(When a connected AI app asks, your Naver data is sent to that app and its AI provider's servers.)_

4. In the guide that opens, press **[명령 복사하기]** (copy the command). It is the same command as in Step 2.

## Step 2 — Install

There are two ways. Pick one.

### Install with the command

One command finds **every** AI app on your computer and connects them automatically. Nothing to do per app.

1. **Open a terminal** — on Windows type `cmd` in the search box → "Command Prompt"; on Mac press `⌘+Space` and type `Terminal`; on Linux open your terminal app (often `Ctrl+Alt+T`).
2. **Paste this command and press Enter.**

   ```
   npx -y @modootoday/datalab-extension-mcp@1.18.2 install
   ```

   The helper installs this version of the connector on your computer (`npm install -g`) and registers that installed copy with your AI apps. Lines of English scrolling by is normal. It adds only our entry to your AI apps' settings and touches nothing else. Without permission for global npm installs, it falls back to having each app download and run the connector at start (a slower start).

   The helper runs in three chapters — `1/3` find AI programs, `2/3` connect, `3/3` finish.

3. **Confirm.** It asks exactly one question:

   > "연결할까요?" (엔터 = 예 / n = 아니오)
   >
   > _(Connect? Enter = yes / n = no)_

   Press Enter. Per-app results follow, then a count: `N개 프로그램에 연결했어요.` If it found 0 apps, install an AI app first and run the same command again.

### Hand the install to your AI app

If you'd rather not use a terminal yourself, paste this into an AI app that can run commands (Claude Code, Codex, Gemini CLI and the like). It is in Korean on purpose; the app follows it either way.

```
데이터랩툴즈 연결 프로그램을 설치하고 이 앱에 등록해 줘.
1. node --version 으로 Node.js 22 이상인지 확인해. 없거나 낮으면 설치 방법만 알려 주고 멈춰.
2. npm install -g @modootoday/datalab-extension-mcp@1.18.2 을 실행해.
3. 이 앱의 MCP 설정에 datalab-extension-mcp 라는 이름으로 서버를 추가해.
   명령은 전역 설치된 datalab-extension-mcp 이고, Windows 에서는 cmd /c datalab-extension-mcp 야.
   npx 는 쓰지 말고, 키나 환경 변수는 넣지 마.
4. 끝나면 이 앱을 완전히 종료했다가 다시 켜라고 알려 줘.
```

_(Install the DataLab Tools connector and register it with this app: check Node.js 22 or later and stop with install advice if missing; run the pinned global install; add a server named datalab-extension-mcp that runs the global bin, through cmd /c on Windows, never npx, with no key or environment variables; then ask me to fully restart the app.)_

<details>
<summary><strong>No Node.js? — install it in one go</strong></summary>

If the command errors with `'npx' is not recognized`, Node.js isn't installed. On Windows, install Node.js first and run the command again. On Mac and Linux, this one command installs Node.js (no admin rights) and then continues to connect, skipping the install if Node.js is already there.

- **Windows** (open PowerShell and paste): installs the official Node.js package; then open a new PowerShell window and run the Step 2 command again. Without winget, get the LTS installer from [nodejs.org](https://nodejs.org/).

  ```
  winget install OpenJS.NodeJS.LTS
  ```

- **Mac · Linux** (open the terminal and paste):

  ```
  curl -fsSL https://app.datalab.tools/install/mcp.sh | sh
  ```

If you have no AI app yet, you can also pick one to install right there (choosing is optional).

> Want to see what it does before running it? Open that URL in a browser — it serves the script itself, in plain text.

</details>

<details>
<summary><strong>Install as an AI app plugin</strong></summary>

This repository also installs as a plugin. The app runs the connector at this version, with no key.

- **Claude Code**: `claude plugin marketplace add modootoday/datalab-extension-mcp`, then `claude plugin install datalab-extension-mcp@modootoday`
- **GitHub Copilot CLI**: `copilot plugin install modootoday/datalab-extension-mcp`
- **Gemini CLI**: `gemini extensions install https://github.com/modootoday/datalab-extension-mcp`
- **Antigravity**: `agy plugin install https://github.com/modootoday/datalab-extension-mcp`
- **VS Code**: run "Chat: Install Plugin from Source" from the Command Palette and enter this repository's URL.

</details>

Apps it **connects automatically**: Claude Desktop, Claude Code, ChatGPT desktop, Codex CLI, Gemini CLI, Cursor, Windsurf, Amazon Q Developer, JetBrains Junie, Kiro.
Apps it **only prints instructions for** (follow the on-screen guide): VS Code, Zed, Cline, Roo Code, LM Studio, Warp.

## Step 3 — Allow

1. **Fully quit your AI app and start it again.** Just closing the window can leave it running in the background (Windows: tray icon → quit; Mac: `⌘+Q`; Linux: Quit from the app menu).
2. **With the side panel open**, use DataLab Tools in the AI app for the first time. The panel asks:

   > "'앱 이름' 앱이 연결을 요청했어요"
   >
   > _('App name' asked to connect)_

   Press **[허용하기]** (allow) and you're done. If you didn't start this yourself, press **[거절하기]** (decline). A request can be allowed for 10 minutes.

3. If the card at the top of the side panel is **green** and reads "연결됨" (connected), you're set. Ask something like "How did my blog do last week?" in your AI app; if real numbers come back, everything's done. If it isn't green, go to [Troubleshooting](#troubleshooting).

The connection itself lives only while the side panel is open.

## Good to know

- **You're connected only while the DataLab Tools side panel is open** — close it and the connection closes too. Reopen and it reconnects automatically.
- The connector is only a bridge — it stores no logins or passwords and doesn't work outside your computer.
- UI-only extension updates apply after a hard refresh. Releases that change MCP tools or skills require reinstalling the connector from the extension card.

## Skill catalog

Installing also connects the **skill catalog** (skills.modoo.today). No skill files are
copied to your machine; the AI app fetches them from the catalog when it needs them.

- Claude Code and Codex are connected automatically. For other apps, follow the card shown
  at the end of the install and add `https://skills.modoo.today/mcp` as a remote (HTTP) server.
- The first use opens a modoo.today sign-in window once.
- `--no-skills` connects the extension only, without the catalog.
- Skill files copied by earlier versions are cleaned up during install. Only files carrying
  our install marker are removed; anything another tool placed is left alone.

## Putting another browser on this computer

The first browser to press **[허용하기]** is the one this computer's connector
pairs with. To use another browser on this computer too, copy the **connection key**
from the connected browser (extension settings → **다른 AI 앱에 연결 (MCP)**) and
paste it on the same screen in the other browser. No registration codes, no
issuing, no roster.

This is one computer only — the connector listens on 127.0.0.1, so no other
machine can reach it, and the key is never something to send to another person.

To see which browsers an AI app can reach right now, ask for `datalab_browsers`.
It answers with the browsers currently attached, named by what each one reported
about itself.

## Troubleshooting

Whatever happened, the first question is always the same — **is the panel open?** If the card reads "문제 발생" (problem), look for the red sentence under it in the headings below. If it isn't there, the connector is passing an error through verbatim — see "None of the above" further down for the log file.

### "연결을 기다리고 있어요. AI 앱을 켜면 자동으로 연결돼요."

_(Waiting for a connection. It connects automatically when you start your AI app.)_

Not an error — the normal state. Start your AI app and it connects on its own.

### "확장과 연결되지 않았어요. 확장 아이콘으로 사이드패널을 열어 주세요."

_(Not connected to the extension. Open the side panel from the extension icon.)_

Shown when MCP is switched on but **this screen was opened outside the extension's side
panel**. In that state the panel does not start the connection, so starting your AI app
will not connect it. Close any browser tab showing this screen and open the side panel
from the extension icon. If it still shows, check that the extension is on and up to date.

### "연결 프로그램이 예전 버전이에요. 새 설정을 AI 앱 설정에 붙여넣고…"

_(The connector is an older version. Paste the new setup into your AI app, then fully restart it.)_

Press **[새 설정 복사]** (copy new setup) on the card, paste as instructed, then fully quit and restart your AI app.

### "연결 프로그램이 이 브라우저의 키를 받지 않아요…"

_(The connector will not take this browser's key.)_

Two causes, and the connector does not say which.

**If you installed from another browser on this computer**, put that browser's
key into this one and you are done (see [Putting another browser on this
computer](#putting-another-browser-on-this-computer)). Pasting a new setup here
instead **disconnects that browser.**

**If you did not**, the connector is running with the key its AI app handed it
at startup. **[다시 연결하기] (reconnect) will not help** — the other side keeps
presenting that same old key.

1. Press **[새 설정 복사]** (copy new setup) on the card
2. Paste it into the AI app's settings
3. **Fully quit that AI app and start it again** — not just close the window (Windows: tray icon → quit; Mac: `⌘+Q`; Linux: Quit from the app menu)

Item 3 is what brings the connector back with the key stored in the AI app.

### "이 컴퓨터의 연결 프로그램은 다른 브라우저와 연결돼 있어요. 그 브라우저 설정에서 연결 키를 복사해 이 브라우저 설정에 붙여넣어 주세요."

_(This computer's connector is paired with another browser. Copy the connection key from that browser's settings into this browser's settings.)_

Another browser on this computer pressed **[허용하기]** first. Put that browser's
connection key into this one and both work ([Putting another browser on this
computer](#putting-another-browser-on-this-computer)). If you never connected one,
someone else may have; disconnect with the command the panel shows and try again.

### "연결 대기 시간이 지났어요. AI 앱을 완전히 껐다 켠 뒤 10분 안에 사이드 패널을 열어 주세요."

_(The wait ran out. Fully restart the AI app, then open the side panel within 10 minutes.)_

A connection request can be allowed for 10 minutes only. Fully quit and restart the
AI app, open the side panel and press **[허용하기]**.

### "연결 통로(포트)를 다른 프로그램이 쓰고 있어요."

_(Another program is using the connection path (port).)_

Press **[업데이트 명령어 복사]** (copy update command) on the card, paste it into a terminal, and run it — the connector reconnects with new settings.

### "크롬에서 데이터랩툴즈 패널이 닫혀 있어요. 크롬을 열고 데이터랩툴즈 패널을 열어 두면 바로 동작해요."

_(The DataLab Tools panel is closed in Chrome. Open Chrome, keep the panel open, and it works right away.)_

Exactly what it says. Open Chrome, keep the DataLab Tools side panel open, and it works immediately.

### I only see 10 tools

That's expected — **it's deliberate.**

There are over 250 tools. Sending all of them as a list runs into the cap each AI app
sets: some quietly drop whatever doesn't fit, some refuse the connection outright.
So only the discovery tools go in the list, and **the rest are selected from the
user's intent and handed over as an answer.**

Nothing is out of reach because of it. Ask for something that isn't in the list —
"show me the reviews for my shop" — and the AI looks it up first, then runs it.
Local fuzzy matching covers spacing, inflection, and minor typos. The only cost is
that extra step. If the first search misses, the connector returns compact feature
groups and pages through the selected group's tools eight at a time. **The first
call to a given tool can be a second or two slower.**

If the AI says a feature doesn't exist, tell it: **"search the hidden tools and
answer again."**

### The card is green but your AI app can't find the tools

The usual cause: **the AI app was closed, not quit.** Closing the window leaves it running in the background, and in that state it never re-reads the tool list.

- **Windows** — quit from the tray icon at the bottom right
- **Mac** — `⌘+Q`, not just closing the window
- **Linux** — Quit from the app menu, or end the process from a terminal

Start it again after a full quit and it picks the tools up. If they still aren't there, run the Step 2 command once more.

<details>
<summary>The connection disappeared one day / 'npx' is not recognized</summary>

- **When the connection disappears** — run the very command you used at the start once more; it safely re-registers. (Some AI apps clean up their settings file and drop the connection.)

  ```
  npx -y @modootoday/datalab-extension-mcp@1.18.2 install
  ```

- **`'npx' is not recognized...`** — Node.js isn't installed. Follow "No Node.js?" in Step 2, then run the command again.

- **None of the above** — the connector writes down what happened to it. One file:

  ```
  ~/.datalab-mcp/connector.log
  ```

  The last lines say what it ran into. It rolls over past a size cap, so at most two files ever exist. Sending the tail of this file along with a question makes it far quicker to answer. (Nothing you looked up and nothing you wrote goes into it.)

</details>

## Safety

- **Lookups just work; editing is asked for, every time.** Looking data up is immediate. Changing your **Naver draft** or a photo/video editor — setting the title, inserting text, undo, replacing the whole body, inserting a photo, closing an editor window, deleting anything — is confirmed in the side panel before it runs. So is anything that costs money. **There is no setting that approves these in advance.** Publishing and ad spend are opened by nothing at all.
- **It never publishes.** Posting or making a draft public is not connected — edits stay in the draft window, and publishing is yours to do.
- **The connector stores no logins, passwords, or cookies.** It never contacts Naver directly. Every lookup happens inside your own logged-in browser.
- **It works only inside your computer.** Nothing outside can connect, only a browser you allowed attaches, and every session is checked against the connection key and the extension identity.
- **How data moves** — "연결된 AI 앱이 요청하면 네이버 데이터가 해당 앱과 그 AI 제공사 서버로 전달돼요." When the AI app asks, the result goes to that AI provider (e.g. Anthropic) — exactly what you agreed to when turning this on. Retention and training are governed by each provider's policy, so check the privacy policy of the AI app you use.
- **The saved command names an exact bootstrap version.** At startup and while idle, the connector checks the canonical release and promotes itself to the current secure, compatible version. Diagnostic environments can opt out with `--no-self-update`.
- **You can check the package was built from the public repository.** Run `npm audit signatures`, or `npm view @modootoday/datalab-extension-mcp@1.18.2 dist.attestations` to see its build provenance. If you install through another npm registry, such as a company mirror, this checks what that registry served.
- **The full source is open.** That said, it can't stop malware already running under your own account — this connector's locks control remote and cross-origin access, not an already-compromised host.

## Removing it

1. Run this in a terminal (it removes the `datalab-extension-mcp` entries registered in your AI apps, and any `datalab` entry an earlier version registered).

   ```
   npx -y @modootoday/datalab-extension-mcp@1.18.2 uninstall
   ```

2. Turn **MCP 연결** off in the extension settings. The panel is the bridge, so with it off a leftover config line can look nothing up.

Deleting the extension also renders any leftover connector inert. A leftover line can be removed with the command above, and does nothing if left.

## FAQ

<details>
<summary>Free? / ChatGPT web / always on / what data / other computers</summary>

- **Is it free?** The connector is, and it's fully open-source. A few features do cost money — generating a photo with AI, putting a voice on a video — and each one asks before it runs, with the amount where we can work it out. Nothing is ever charged without asking first.
- **Does the ChatGPT website work?** No. Only the installed desktop app connects.
- **Do I keep it always on?** No. It connects only while the panel is open.
- **What data does it read?** Blog stats, keywords, ads — what DataLab Tools shows. Scoped to the Naver account you're logged into in Chrome.
- **Other computers?** Yes, but set it up and allow it once per computer.

</details>

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
