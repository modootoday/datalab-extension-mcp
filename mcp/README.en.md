_[한국어](./README.md)_

# DataLab Tools Connector

A small free program that connects an AI app like Claude to DataLab Tools. Once connected, you can ask your AI:

> "How did my blog do last week?"

and it answers with the **real numbers** from your Naver blog, keywords, and ads — not guesses. **Lookups just work; editing is asked for** — changing your draft or an editor needs a separate allow, and it never publishes. A first-timer is usually done in about 10 minutes.

> The extension UI and the setup helper speak Korean; this page mirrors the Korean README ([한국어](./README.md)) for reference. The exact sentences you'll see on screen are shown in Korean below, with an English gloss.

## What you need

Set this up once per computer.

| Need                                 | How                                                                                                                                                                                                                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chrome + the DataLab Tools extension | If you don't have it yet, install from [app.datalab.tools](https://app.datalab.tools/).                                                                                                                                                                                |
| An AI app                            | The program that answers your questions. It must be an **app installed on your computer** (websites won't work). Claude Desktop is free at [claude.ai](https://claude.ai/download); ChatGPT works as the **desktop app only**, from [openai.com](https://openai.com/). |
| Node.js                              | The free program that runs the connector. Get it from [nodejs.org](https://nodejs.org/) via the **LTS** button. If that's a hassle, the one-liner in [Step 2](#step-2--install) installs Node.js for you in one go — no admin rights needed.                           |

> A work computer may block installs by policy. Check with your IT team first to avoid wasting time.

## Three steps

| Step              | What                                                            | Where                    |
| ----------------- | --------------------------------------------------------------- | ------------------------ |
| **1. Turn it on** | Flip a switch in the extension panel and note the pairing token | DataLab Tools side panel |
| **2. Install**    | Run one command and paste the token                             | Terminal                 |
| **3. Verify**     | Ask a test question in your AI app                              | Your AI app              |

Feel free to read [Safety](#safety) first if you'd like reassurance before starting.

## Step 1 — Turn it on

1. Click the DataLab Tools icon at Chrome's top-right to open the **side panel**. (If you don't see it, find it under the puzzle-piece icon.)
2. In **Settings** on the left, turn on the **"다른 AI 앱에 연결 (MCP)"** (Connect to another AI app) switch.
3. A consent screen appears. Read it and agree.

   > "연결된 AI 앱이 요청하면 네이버 데이터가 해당 앱과 그 AI 제공사 서버로 전달돼요."
   >
   > _(When a connected AI app asks, your Naver data is sent to that app and its AI provider's servers.)_

4. When the **"MCP 연결" (MCP connection) card** shows in the panel, you're set. You'll use the **pairing token** on it in the next step — press **[복사]** (copy) to put it on the clipboard now. ([보기] reveals it if you want to see it.)

> "이 코드는 이 컴퓨터 전용 비밀번호예요. 다른 사람에게 보내지 마세요."
>
> _(This code is a password for this computer only. Don't send it to anyone.)_

Avoid sharing a screenshot or the copied setup. If it may have leaked, press **[새 토큰 발급]** (issue a new token) on the card — the old code stops working immediately and a matching setup lands on your clipboard. Paste that into each AI app you had connected.

## Step 2 — Install

One command finds **every** AI app on your computer and connects them automatically. Nothing to do per app.

1. **Open a terminal** — on Windows type `cmd` in the search box → "Command Prompt"; on Mac press `⌘+Space` and type `Terminal`; on Linux open your terminal app (often `Ctrl+Alt+T`).
2. **Paste this command and press Enter.** (`@1.7.1` is the pinned version, so the connector never changes behind your back.)

   ```
   npx -y @modootoday/datalab-extension-mcp@1.7.1 install
   ```

   Lines of English scrolling by is normal. This only downloads and runs the connector — it touches nothing else.

3. **Paste the pairing token.** The helper asks:

   > "복사한 연결 토큰을 여기에 붙여넣어 주세요:"
   >
   > _(Paste the connection token you copied here:)_

   Paste the token from the Step 1 card and press Enter.

4. **Confirm.** It asks exactly one question:

   > "위 N개 프로그램에 연결할까요?" (Y/n)
   >
   > _(Connect to the N programs above?)_

   Press `Y`. If it found 0 apps, install an AI app first and run the same command again.

5. When you see this, you're done:

   > 마지막 한 단계: AI 앱을 완전히 종료했다가 다시 실행해 주세요.
   > (Windows: 작업 표시줄 트레이 아이콘에서 종료)
   >
   > _(One last step: fully quit your AI app and start it again. Windows: quit from the taskbar tray icon.)_

   Just closing the window can leave it running in the background, so a **full quit** matters (Windows: tray icon → quit; Mac: `⌘+Q`; Linux: Quit from the app menu).

<details>
<summary><strong>No Node.js? — install it in one go</strong></summary>

If the command errors with `'npx' is not recognized`, Node.js isn't installed. This one command installs Node.js first (no admin rights) and then continues to connect. If Node.js is already there, it skips the install. You can use this instead of the Node.js step in [What you need](#what-you-need).

- **Windows** (open PowerShell and paste):

  ```
  irm https://app.datalab.tools/install/mcp.ps1 | iex
  ```

- **Mac · Linux** (open the terminal and paste):

  ```
  curl -fsSL https://app.datalab.tools/install/mcp.sh | sh
  ```

When it asks for the pairing token, paste the one from the Step 1 card. If you have no AI app yet, you can also pick one to install right there (choosing is optional).

> Want to see what it does before running it? Open that URL in a browser — it serves the script itself, in plain text.

</details>

Apps it **connects automatically**: Claude Desktop, Claude Code, ChatGPT desktop, Codex CLI, Gemini CLI, Cursor, Windsurf, Amazon Q Developer, JetBrains Junie, Kiro.
Apps it **only prints instructions for** (follow the on-screen guide): VS Code, Zed, Cline, Roo Code, LM Studio, Warp.

## Step 3 — Verify

- If the card at the top of the side panel is **green** and reads "연결됨" (connected), you're set. If it isn't green, go to [Troubleshooting](#troubleshooting).
- Ask something like "How did my blog do last week?" in your AI app; if real numbers come back, everything's done.

## Good to know

- **You're connected only while the DataLab Tools side panel is open** — close it and the connection closes too. Reopen and it reconnects automatically.
- The connector is only a bridge — it stores no logins or passwords and doesn't work outside your computer.
- When the extension updates, new features appear in your AI app automatically. The connector program itself stays the same.

## Troubleshooting

Whatever happened, the first question is always the same — **is the panel open?** If the card reads "문제 발생" (problem), look for the red sentence under it in the headings below. If it isn't there, the connector is passing an error through verbatim — see "None of the above" further down for the log file.

### "연결을 기다리고 있어요. AI 앱을 켜면 자동으로 연결돼요."

_(Waiting for a connection. It connects automatically when you start your AI app.)_

Not an error — the normal state. Start your AI app and it connects on its own.

### "네이버 페이지를 열면 연결돼요. MCP 는 네이버 탭이 열려 있는 동안에만 동작해요."

_(Open a Naver page and it connects. MCP only runs while a Naver tab is open.)_

Shown when MCP is switched on but **no Naver page is open anywhere**. In that state
the connector never starts, so starting your AI app will not connect it. Leave one
Naver tab open (a blog, SmartPlace, …) and it connects on its own.

### "커넥터가 예전 버전이에요. 버튼 한 번이면 새 버전으로 바뀌어요."

_(The connector is an older version. One button updates it.)_

Press **[새 설정 복사]** (copy new setup) on the card, paste as instructed, then fully quit and restart your AI app.

### "AI 앱이 예전 연결 코드를 쓰고 있어요…"

_(Your AI app is using an old connection code.)_

The connector is running with the code its AI app handed it at startup. **[다시 연결하기] (reconnect) will not help here** — the other side keeps presenting that same old code.

1. Press **[새 설정 복사]** (copy new setup) on the card
2. Paste it into the AI app's settings
3. **Fully quit that AI app and start it again** — not just close the window (Windows: tray icon → quit; Mac: `⌘+Q`; Linux: Quit from the app menu)

Step 3 is what brings the connector back up with the new code. 🔴 **Don't press [새 토큰 발급] (issue a new token) again** — that changes the code once more and puts you right back here.

### "연결 통로(포트)를 다른 프로그램이 쓰고 있어요."

_(Another program is using the connection path (port).)_

Press **[업데이트 명령어 복사]** (copy update command) on the card, paste it into a terminal, and run it — the connector reconnects with new settings.

### "크롬에서 데이터랩툴즈 패널이 닫혀 있어요. 크롬을 열고 데이터랩툴즈 패널을 열어 두면 바로 동작해요."

_(The DataLab Tools panel is closed in Chrome. Open Chrome, keep the panel open, and it works right away.)_

Exactly what it says. Open Chrome, keep the DataLab Tools side panel open, and it works immediately.

### I only see 12 tools

That's expected — **it's deliberate.**

There are 168 tools. Sending all of them as a list runs into the cap each AI app
sets: some quietly drop whatever doesn't fit, some refuse the connection outright.
So the common ones go in the list, and **the rest are handed over as an answer when
the AI asks for them.**

Nothing is out of reach because of it. Ask for something that isn't in the list —
"show me the reviews for my shop" — and the AI looks it up first, then runs it. The
only cost is that extra step: **the first call to a given tool can be a second or
two slower.**

If the AI says a feature doesn't exist, tell it: **"check your tool catalog and
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
  npx -y @modootoday/datalab-extension-mcp@1.7.1 install
  ```

- **`'npx' is not recognized...`** — Node.js isn't installed. The "No Node.js?" one-liner in Step 2 is the simplest fix.

- **None of the above** — the connector writes down what happened to it. One file:

  ```
  ~/.datalab-mcp/connector.log
  ```

  The last lines say what it ran into. It rolls over past a size cap, so at most two files ever exist. Sending the tail of this file along with a question makes it far quicker to answer. (Nothing you looked up and nothing you wrote goes into it.)

</details>

## Safety

- **Lookups just work; editing is asked for.** Looking data up is immediate. Changing your **Naver draft** or a photo/video editor needs **AI editing** allowed, in the side panel or in settings, and you pick how long that lasts: allow it for this connection and closing the panel turns it back off, or save **always allow** so you don't switch it on again (turned off in the same place). In the draft, that covers setting the title, inserting text, and undo. Replacing the whole body, inserting a photo, closing an editor window, deleting anything, and anything that costs money are asked about **every single time** — saving "always allow" does not cover them.
- **It never publishes.** Posting or making a draft public is not connected — edits stay in the draft window, and publishing is yours to do.
- **The connector stores no logins, passwords, or cookies.** It never contacts Naver directly. Every lookup happens inside your own logged-in browser.
- **It works only inside your computer.** Nothing outside can connect, and it's double-locked: the connection token plus a check that the caller really is your extension.
- **How data moves** — "연결된 AI 앱이 요청하면 네이버 데이터가 해당 앱과 그 AI 제공사 서버로 전달돼요." When the AI app asks, the result goes to that AI provider (e.g. Anthropic) — exactly what you agreed to when turning this on. Retention and training are governed by each provider's policy, so check the privacy policy of the AI app you use.
- **The version is pinned and never changes behind your back.** When a new version ships, the panel tells you and the choice is yours.
- **The full source is open.** That said, it can't stop malware already running under your own account — this connector's locks control remote and cross-origin access, not an already-compromised host.

## Removing it

1. Run this in a terminal (it removes the entries registered in your AI apps).

   ```
   npx -y @modootoday/datalab-extension-mcp@1.7.1 uninstall
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
- **Other computers?** Yes, but set it up once per computer; the pairing token is per-computer too.
</details>

## Developer appendix

<details>
<summary>Technical summary for source verification / integration</summary>

- Repo: <https://github.com/modootoday/datalab-extension-mcp>
- npm: <https://www.npmjs.com/package/@modootoday/datalab-extension-mcp>

**Environment variables**

| Variable                   | Required | Default     | Description                                                |
| -------------------------- | -------- | ----------- | ---------------------------------------------------------- |
| `DATALAB_MCP_TOKEN`        | required | —           | Pairing token. Issued and replaced in the extension panel. |
| `DATALAB_MCP_EXTENSION_ID` | required | —           | The extension ID allowed to connect.                       |
| `DATALAB_MCP_PORT`         | optional | `8765`      | Listen port.                                               |
| `DATALAB_MCP_HOST`         | optional | `127.0.0.1` | Bind address. Non-loopback values are rejected.            |

**Rate limit** — `10` calls of burst per session, refilling at `1` per second. It damps runaway loops rather than enforcing billing, so ordinary use never reaches it.

**Failure responses** — a failed tool call arrives as an `isError` result rather than a protocol error, and its body is JSON like a success (`ok` / `reason` / `message` / `retryable`, plus `retryAfterMs` when waiting helps). Canonical list of every failure code and whether it is worth retrying: <https://github.com/modootoday/datalab-extension-mcp/blob/main/mcp-core/src/errors.ts>

**Architecture** — the connector is a relay with no credentials and no egress. The tool list is served by the extension; the canonical catalog is the store-reviewed extension code. Transport is loopback HTTP+SSE with dual auth (Origin check + token check), and the allowlist — both the read-only half and the tier table that gates every write — is enforced by the extension. Canonical allowlist (with per-item exclusion reasons): <https://github.com/modootoday/datalab-extension-mcp/blob/main/mcp-core/src/allowlist.ts>

**Supply chain** — the public repo is the entire source. npm publishing uses OIDC trusted publishing + provenance, with no long-lived token (`npm audit signatures` verifies). Every install surface pins an exact version, so a compromised distribution path can't push new code to installed users; upgrades always go through the user's explicit choice.

**License** — MIT ([LICENSE](./LICENSE)).

</details>
