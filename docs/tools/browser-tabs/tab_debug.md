---
layout: "dl-tool"
title: "내 브라우저 — 탭에서 코드 실행(개발용)"
description: "이미 열려 있는 네이버 탭 하나의 페이지 안에서 짧은 자바스크립트를 실행하고 반환값을 돌려주는 개발용 도구다. 화면 구조를 들여다보거나 점검 스크립트를 돌릴 때 쓰고, 글쓰기 창의 에디터 안이면 editor_debug 를 쓴다. 주소가 url 과 같은 탭이 정확히 하나일 때만 실행하고 탭을 새로 열지 않는다. 없으면 no-matching-tab, 여럿이면 multiple-tabs, 로그인·결제·주문·메일·고객센터와 데이터랩툴즈 화면이면 host-refused 로 답하며 시크릿 창의 탭은 보이지 않는다. 매번 사용자 확인을 받는다. 코드는 회원의 로그인 상태로 그 페이지가 할 수 있는 일을 모두 할 수 있고, 시작된 코드는 되돌릴 수 없으며 탭을 새로고침하면 멈춘다. 반환값이 깊이·개수 상한에 걸리면 clipped 가 붙고 maxChars 를 넘으면 truncated 가 true 다. stage 가 eval-blocked 면 그 페이지가 문자열 코드 실행을 막은 것이다."
nav: "tools"
tool: "tab_debug"
generated: true
---

# 내 브라우저 — 탭에서 코드 실행(개발용)

`tab_debug` · 매번 물어봄 · 내 컴퓨터

이미 열려 있는 네이버 탭 하나의 페이지 안에서 짧은 자바스크립트를 실행하고 반환값을 돌려주는 개발용 도구다. 화면 구조를 들여다보거나 점검 스크립트를 돌릴 때 쓰고, 글쓰기 창의 에디터 안이면 editor_debug 를 쓴다. 주소가 url 과 같은 탭이 정확히 하나일 때만 실행하고 탭을 새로 열지 않는다. 없으면 no-matching-tab, 여럿이면 multiple-tabs, 로그인·결제·주문·메일·고객센터와 데이터랩툴즈 화면이면 host-refused 로 답하며 시크릿 창의 탭은 보이지 않는다. 매번 사용자 확인을 받는다. 코드는 회원의 로그인 상태로 그 페이지가 할 수 있는 일을 모두 할 수 있고, 시작된 코드는 되돌릴 수 없으며 탭을 새로고침하면 멈춘다. 반환값이 깊이·개수 상한에 걸리면 clipped 가 붙고 maxChars 를 넘으면 truncated 가 true 다. stage 가 eval-blocked 면 그 페이지가 문자열 코드 실행을 막은 것이다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `url` | 문자열 | O | 코드를 실행할 탭의 주소. 열려 있는 탭의 주소 그대로 보낸다(# 뒤는 비교하지 않는다). |
| `code` | 문자열 | O | 실행할 코드. async 함수의 본문이며 return 으로 값을 돌려준다. 인자 ctx 는 log(...)·sleep(ms)·json(value)·snapshot(selector, limit) 를 준다. 예: return ctx.snapshot('h2', 5) |
| `timeoutMs` | 정수 | X | 실행을 기다리는 시간(ms). 기본 10000, 최대 18000. |
| `maxChars` | 정수 | X | 반환값을 JSON 으로 바꾼 글자 수 상한. 기본 20000. |

## 함께 쓰는 도구

- [코드 실행(개발용)](/tools/editor-detail/editor_debug/) `editor_debug`
- [내 브라우저 — 열려 있는 탭 보기](/tools/browser-tabs/tab_list/) `tab_list`
- [내 브라우저 — 새 탭 열기](/tools/browser-tabs/tab_open/) `tab_open`
- [내 브라우저 — 그 탭을 앞으로](/tools/browser-tabs/tab_focus/) `tab_focus`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
