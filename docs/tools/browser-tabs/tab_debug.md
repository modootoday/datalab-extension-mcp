---
layout: "dl-tool"
title: "내 브라우저 — 탭에서 코드 실행(개발용)"
description: "개발용. 이미 열려 있는 네이버 탭 하나의 페이지 안에서 짧은 자바스크립트를 직접 실행하고 반환값을 돌려준다. 검색 결과, 블로그 글, 인플루언서 홈, 스마트플레이스 같은 화면의 구조를 들여다보거나 점검 스크립트를 돌릴 때 쓴다. 글쓰기 창의 에디터 안은 editor_debug 를 쓴다. url 은 열려 있는 탭의 주소 그대로여야 하고, 그 주소의 탭이 정확히 하나일 때만 실행한다. 없으면 no-matching-tab, 여러 개면 multiple-tabs 로 답하고 탭을 새로 열지 않는다. 네이버 주소만 되고 로그인(nid)·결제(pay)·주문·메일·고객센터 화면과 데이터랩툴즈 화면은 host-refused 로 거절한다. 시크릿 창의 탭은 보이지 않는다. 코드는 탭의 맨 위 화면에서 async 함수의 본문으로 돌아 await 와 return 을 쓸 수 있고, 인자 하나 ctx 를 받는다. ctx.log(...) 는 결과의 logs 에 줄을 남기고(50줄, 줄마다 500자), ctx.sleep(ms) 는 기다리고, ctx.json(value) 는 값을 JSON 으로 바꿀 수 있는 모양으로 돌려주고, ctx.snapshot(selector, limit) 는 맞는 요소를 최대 limit 개(기본 10, 최대 50) 태그·id·클래스·글자(200자)·속성으로 돌려준다. 반환값은 순환과 DOM 과 함수를 걸러 JSON 으로 바뀌고 editor_debug 와 같은 상한을 쓴다: 깊이 6단계, 객체 키 100개, 배열 항목 100개, 문자열 2000자. 상한에 걸리면 clipped 가 붙고, JSON 전체가 maxChars 를 넘으면 잘라서 truncated 를 true 로 한다. 결과의 page 는 실행한 순간의 주소·제목·readyState 다. 코드는 회원의 로그인 상태로 그 페이지가 할 수 있는 일을 모두 할 수 있으니 읽기만 할 때는 바꾸지 않는 코드를 쓴다. 이미 시작된 코드는 되돌릴 수 없고 탭을 새로고침하면 멈춘다. 페이지가 문자열 코드 실행을 막으면 stage 가 eval-blocked 로 온다. 매번 사용자 확인을 받는다."
nav: "tools"
tool: "tab_debug"
generated: true
---

# 내 브라우저 — 탭에서 코드 실행(개발용)

`tab_debug` · 매번 물어봄 · 내 컴퓨터

개발용. 이미 열려 있는 네이버 탭 하나의 페이지 안에서 짧은 자바스크립트를 직접 실행하고 반환값을 돌려준다. 검색 결과, 블로그 글, 인플루언서 홈, 스마트플레이스 같은 화면의 구조를 들여다보거나 점검 스크립트를 돌릴 때 쓴다. 글쓰기 창의 에디터 안은 editor_debug 를 쓴다. url 은 열려 있는 탭의 주소 그대로여야 하고, 그 주소의 탭이 정확히 하나일 때만 실행한다. 없으면 no-matching-tab, 여러 개면 multiple-tabs 로 답하고 탭을 새로 열지 않는다. 네이버 주소만 되고 로그인(nid)·결제(pay)·주문·메일·고객센터 화면과 데이터랩툴즈 화면은 host-refused 로 거절한다. 시크릿 창의 탭은 보이지 않는다. 코드는 탭의 맨 위 화면에서 async 함수의 본문으로 돌아 await 와 return 을 쓸 수 있고, 인자 하나 ctx 를 받는다. ctx.log(...) 는 결과의 logs 에 줄을 남기고(50줄, 줄마다 500자), ctx.sleep(ms) 는 기다리고, ctx.json(value) 는 값을 JSON 으로 바꿀 수 있는 모양으로 돌려주고, ctx.snapshot(selector, limit) 는 맞는 요소를 최대 limit 개(기본 10, 최대 50) 태그·id·클래스·글자(200자)·속성으로 돌려준다. 반환값은 순환과 DOM 과 함수를 걸러 JSON 으로 바뀌고 editor_debug 와 같은 상한을 쓴다: 깊이 6단계, 객체 키 100개, 배열 항목 100개, 문자열 2000자. 상한에 걸리면 clipped 가 붙고, JSON 전체가 maxChars 를 넘으면 잘라서 truncated 를 true 로 한다. 결과의 page 는 실행한 순간의 주소·제목·readyState 다. 코드는 회원의 로그인 상태로 그 페이지가 할 수 있는 일을 모두 할 수 있으니 읽기만 할 때는 바꾸지 않는 코드를 쓴다. 이미 시작된 코드는 되돌릴 수 없고 탭을 새로고침하면 멈춘다. 페이지가 문자열 코드 실행을 막으면 stage 가 eval-blocked 로 온다. 매번 사용자 확인을 받는다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `url` | 문자열 | O | 코드를 실행할 탭의 주소. 열려 있는 탭의 주소 그대로 보낸다(# 뒤는 비교하지 않는다). |
| `code` | 문자열 | O | 실행할 코드. async 함수의 본문이며 return 으로 값을 돌려준다. 예: return ctx.snapshot('h2', 5) |
| `timeoutMs` | 정수 | X | 실행을 기다리는 시간(ms). 기본 10000, 최대 18000. |
| `maxChars` | 정수 | X | 반환값을 JSON 으로 바꾼 글자 수 상한. 기본 20000. |

## 함께 쓰는 도구

- [코드 실행(개발용)](/tools/editor-detail/editor_debug/) `editor_debug`
- [내 브라우저 — 열려 있는 탭 보기](/tools/browser-tabs/tab_list/) `tab_list`
- [내 브라우저 — 새 탭 열기](/tools/browser-tabs/tab_open/) `tab_open`
- [내 브라우저 — 그 탭을 앞으로](/tools/browser-tabs/tab_focus/) `tab_focus`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
