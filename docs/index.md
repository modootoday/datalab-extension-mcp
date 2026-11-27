---
layout: doc
title: 데이터랩툴즈 커넥터
---

# 데이터랩툴즈 커넥터

AI 앱에서 데이터랩툴즈 도구를 쓰게 해 주는 연결 프로그램이에요. 연결 키는 필요 없어요.

## 명령 하나로 설치하기

터미널에 아래 명령을 붙여넣고 Enter를 눌러요. 컴퓨터에 있는 AI 앱을 찾아 모두 연결해 줘요.

```
npx -y @modootoday/datalab-extension-mcp@1.18.2 install
```

## AI 앱에 설치 맡기기

명령을 실행할 수 있는 AI 앱에 아래 내용을 그대로 붙여넣어요.

```
데이터랩툴즈 연결 프로그램을 설치하고 이 앱에 등록해 줘.
1. node --version 으로 Node.js 22 이상인지 확인해. 없거나 낮으면 설치 방법만 알려 주고 멈춰.
2. npm install -g @modootoday/datalab-extension-mcp@1.18.2 을 실행해.
3. 이 앱의 MCP 설정에 datalab-extension-mcp 라는 이름으로 서버를 추가해.
   명령은 전역 설치된 datalab-extension-mcp 이고, Windows 에서는 cmd /c datalab-extension-mcp 야.
   npx 는 쓰지 말고, 키나 환경 변수는 넣지 마.
4. 끝나면 이 앱을 완전히 종료했다가 다시 켜라고 알려 줘.
```

## 그다음

AI 앱을 완전히 종료했다가 다시 켜고, 크롬에서 데이터랩툴즈 사이드 패널을 열어 두세요. AI 앱이 처음 연결하면 패널이 허용할지 물어요. **[허용하기]** 를 누르면 끝이에요.

- [자세한 설치 방법과 문제해결](https://github.com/modootoday/datalab-extension-mcp#readme)
- [npm 패키지 보기](https://www.npmjs.com/package/@modootoday/datalab-extension-mcp)
