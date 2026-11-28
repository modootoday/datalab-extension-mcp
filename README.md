_[English](./README.en.md)_

# 데이터랩툴즈 커넥터

Claude 같은 AI 앱을 데이터랩툴즈에 연결해 주는 작은 무료 프로그램이에요. 연결되면 AI에게 이렇게 물어볼 수 있어요.

> "지난주 내 블로그 어땠어?"

그러면 짐작이 아니라 내 네이버 블로그·키워드·광고의 **실제 수치**로 답해요. **조회는 바로 되고, 고치는 건 물어봐요.** 발행은 하지 않아요.

**사용 안내는 [mcp.datalab.tools](https://mcp.datalab.tools/)에 있어요.**

| 이럴 때                      | 여기를 보세요                                         |
| ---------------------------- | ----------------------------------------------------- |
| 처음 설치하고 연결할 때      | [처음 연결하기](https://mcp.datalab.tools/start/)     |
| 카드에 빨간 문장이 보일 때   | [문제 해결](https://mcp.datalab.tools/troubleshoot/)  |
| 어떤 도구가 있는지 볼 때     | [도구 문서](https://mcp.datalab.tools/tools/)         |
| 바로 쓸 프롬프트가 필요할 때 | [한 줄 프롬프트](https://mcp.datalab.tools/guides/)   |
| 데이터가 어디로 가는지       | [개인정보와 안전](https://mcp.datalab.tools/privacy/) |
| 묻고 싶은 게 있을 때         | [커뮤니티](https://mcp.datalab.tools/community/)      |

## 빠른 설치

준비물은 브라우저의 데이터랩툴즈 확장, 컴퓨터에 설치한 AI 앱, Node.js 22 이상이에요.

1. 확장 설정에서 **다른 AI 앱에 연결 (MCP)** 스위치를 켜요.
2. 터미널에 아래 명령을 붙여넣어요. 컴퓨터에 있는 AI 앱을 찾아 한 번에 등록해요.

   ```
   npx -y @modootoday/datalab-extension-mcp@1.18.4 install
   ```

3. AI 앱을 완전히 종료했다가 다시 켜고, 사이드패널에서 **[허용하기]** 를 눌러요.

터미널을 쓰기 싫다면 명령을 실행할 수 있는 AI 앱(Claude Code, Codex, Gemini CLI 등)에 아래 내용을 붙여넣어요.

```
데이터랩툴즈 연결 프로그램을 설치하고 이 앱에 등록해 줘.
1. node --version 으로 Node.js 22 이상인지 확인해. 없거나 낮으면 설치 방법만 알려 주고 멈춰.
2. npm install -g @modootoday/datalab-extension-mcp@1.18.4 을 실행해.
3. 이 앱의 MCP 설정에 datalab-extension-mcp 라는 이름으로 서버를 추가해.
   명령은 전역 설치된 datalab-extension-mcp 이고, Windows 에서는 cmd /c datalab-extension-mcp 야.
   npx 는 쓰지 말고, 키나 환경 변수는 넣지 마.
4. 끝나면 이 앱을 완전히 종료했다가 다시 켜라고 알려 줘.
```

지우려면 `npx -y @modootoday/datalab-extension-mcp@1.18.4 uninstall` 을 실행하고 확장 설정에서 MCP 연결을 꺼요.

여러 사람이 같은 컴퓨터를 쓴다면, 연결 프로그램은 이 컴퓨터의 다른 계정에서 실행한 프로그램의 연결을 받지 않아요. 내 계정에서 실행한 프로그램이나 내가 설치한 브라우저 확장은 브라우저처럼 연결할 수 있으니 믿을 수 있는 것만 설치해 주세요.

## 개발자 부록

<details>
<summary>소스 검증·통합용 기술 요약 (기술 용어 사용)</summary>

- 저장소: <https://github.com/modootoday/datalab-extension-mcp>
- npm: <https://www.npmjs.com/package/@modootoday/datalab-extension-mcp>

**환경 변수**

| 변수                       | 필수 | 기본값      | 설명                                 |
| -------------------------- | ---- | ----------- | ------------------------------------ |
| `DATALAB_MCP_TOKEN`        | 선택 | —           | 고정 토큰. 없으면 패널과 페어링해요. |
| `DATALAB_MCP_EXTENSION_ID` | 선택 | 스토어 확장 | 연결을 허용할 확장 ID.               |
| `DATALAB_MCP_PORT`         | 선택 | `8765`      | 수신 포트.                           |
| `DATALAB_MCP_HOST`         | 선택 | `127.0.0.1` | 바인드 주소. loopback 외 값은 거부.  |

**호출 한도** — 연결 프로그램 하나가 `300`회까지 몰아 부를 수 있고 초당 `50`회씩 다시 찹니다. 브라우저를 여러 대 연결했다면 그 예산을 **함께 씁니다**. 요금 제한이 아니라 폭주 루프 완충용이라 평범한 사용에서는 닿지 않습니다.

**실패 응답** — 도구 호출 실패는 프로토콜 오류가 아니라 `isError` 결과로 오고, 본문은 성공과 같은 JSON입니다(`ok` / `reason` / `message` / `retryable`, 기다리면 풀리는 경우 `retryAfterMs`). 실패 코드 전체 목록과 각각의 재시도 여부 정본: <https://github.com/modootoday/datalab-extension-mcp/blob/main/mcp-core/src/errors.ts>

**아키텍처** — 연결 프로그램은 자격증명도 egress도 없는 릴레이입니다. 도구 목록은 확장이 서빙하며 카탈로그 정본은 스토어 심사를 받는 확장 코드입니다. 전송은 루프백 HTTP+SSE이며 Origin 검증과 브라우저별 세션 검증을 거치고, 도구 등급 표(조회 / 편집 / 파괴적 / 유료 / 미개방)는 확장 쪽에서 집행됩니다 — 목록에 없는 이름은 거부되고, 파괴적·유료는 세션 허용으로 건너뛸 수 없습니다. allowlist 전문(제외 사유 포함)의 정본: <https://github.com/modootoday/datalab-extension-mcp/blob/main/mcp-core/src/allowlist.ts>

**공급망** — 공개 저장소가 전체 소스입니다. npm 발행은 OIDC trusted publishing + provenance로 이루어지고 장기 발행 토큰은 쓰지 않습니다(`npm audit signatures`로 검증 가능). 설치 설정은 정확한 bootstrap 버전을 기록하고, 연결 프로그램은 정본 릴리스로 승격할 때도 같은 검증된 npm 패키지 경로를 사용합니다.

**라이선스** — MIT ([LICENSE](./LICENSE)).

</details>
