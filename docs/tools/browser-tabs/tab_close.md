---
layout: "dl-tool"
title: "내 브라우저 — 그 탭 닫기"
description: "tab_list 가 준 tabId 의 탭을 닫는다. 저장하지 않은 글이 그 탭에 있으면 사라지므로 되돌릴 수 없고, 그래서 호출마다 확인을 받는다. 요청이 아니라 결과를 돌려준다 — 닫은 뒤 다시 세어 본다."
nav: "tools"
tool: "tab_close"
generated: true
---

# 내 브라우저 — 그 탭 닫기

`tab_close` · 매번 물어봄 · 내 컴퓨터

tab_list 가 준 tabId 의 탭을 닫는다. 저장하지 않은 글이 그 탭에 있으면 사라지므로 되돌릴 수 없고, 그래서 호출마다 확인을 받는다. 요청이 아니라 결과를 돌려준다 — 닫은 뒤 다시 세어 본다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `tabId` | 숫자 | O | tab_list 가 돌려준 탭 번호. |

## 함께 쓰는 도구

- [내 브라우저 — 열려 있는 탭 보기](/tools/browser-tabs/tab_list/) `tab_list`
- [내 브라우저 — 새 탭 열기](/tools/browser-tabs/tab_open/) `tab_open`
- [내 브라우저 — 그 탭을 앞으로](/tools/browser-tabs/tab_focus/) `tab_focus`
- [내 브라우저 — 탭에서 코드 실행(개발용)](/tools/browser-tabs/tab_debug/) `tab_debug`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
