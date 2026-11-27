---
layout: "dl-tool"
title: "코드 실행(개발용)"
description: "글쓰기 창 페이지 안에서 짧은 자바스크립트를 실행하고 반환값을 돌려주는 개발용 도구다. 새 도구를 만들기 전에 에디터 내부 객체를 들여다보거나 가설을 시험할 때 쓴다. 매번 사용자 확인을 받고, 코드는 글을 바꿀 수도 있다. 반환값은 순환·DOM·함수를 걸러 JSON 으로 바뀌며, 깊이·키·항목·문자열 상한에 걸리면 clipped 가 붙어 걸린 자리를 알려 주고, JSON 전체가 maxChars 를 넘을 때만 truncated 가 true 다. revisionBefore 와 revisionAfter 가 다르면 글이 바뀐 것이라 editor_undo 나 editor_read_document 로 확인한다. stage 가 eval-blocked 면 페이지가 문자열 코드 실행을 막은 것이다."
nav: "tools"
tool: "editor_debug"
generated: true
---

# 코드 실행(개발용)

`editor_debug` · 매번 물어봄 · 내 컴퓨터

글쓰기 창 페이지 안에서 짧은 자바스크립트를 실행하고 반환값을 돌려주는 개발용 도구다. 새 도구를 만들기 전에 에디터 내부 객체를 들여다보거나 가설을 시험할 때 쓴다. 매번 사용자 확인을 받고, 코드는 글을 바꿀 수도 있다. 반환값은 순환·DOM·함수를 걸러 JSON 으로 바뀌며, 깊이·키·항목·문자열 상한에 걸리면 clipped 가 붙어 걸린 자리를 알려 주고, JSON 전체가 maxChars 를 넘을 때만 truncated 가 true 다. revisionBefore 와 revisionAfter 가 다르면 글이 바뀐 것이라 editor_undo 나 editor_read_document 로 확인한다. stage 가 eval-blocked 면 페이지가 문자열 코드 실행을 막은 것이다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `code` | 문자열 | O | 실행할 코드. async 함수의 본문이며 return 으로 값을 돌려준다. 인자 ctx 는 se(에디터)·controller·json()·components()·sleep(ms)·log(...) 를 준다. 예: return ctx.components().length |
| `timeoutMs` | 정수 | X | 실행을 기다리는 시간(ms). 기본 10000, 최대 18000. |
| `maxChars` | 정수 | X | 반환값을 JSON 으로 바꾼 글자 수 상한. 기본 20000. |

## 함께 쓰는 도구

- [실행 취소](/tools/editor-control/editor_undo/) `editor_undo`
- [문서 전체 읽기](/tools/editor-control/editor_read_document/) `editor_read_document`
- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`
- [문단 서식 적용](/tools/editor-detail/editor_set_paragraph_styles/) `editor_set_paragraph_styles`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
