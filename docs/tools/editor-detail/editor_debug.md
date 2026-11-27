---
layout: "dl-tool"
title: "코드 실행(개발용)"
description: "개발용. 글쓰기 창 페이지 안에서 짧은 자바스크립트를 직접 실행하고 반환값을 돌려준다. 새 도구를 만들기 전에 에디터 내부 객체를 들여다보거나 가설을 시험할 때 쓴다. 코드는 async 함수의 본문이라 await 와 return 을 쓸 수 있고, 인자 하나 ctx 를 받는다. ctx.se 는 에디터 객체, ctx.controller 는 우리 컨트롤러, ctx.json() 은 문서 JSON, ctx.components() 는 컴포넌트 목록, ctx.sleep(ms) 는 기다림, ctx.log(...) 는 결과의 logs 에 줄을 남긴다. 반환값은 순환과 DOM 과 함수를 걸러 JSON 으로 바뀐다. 값마다 상한이 있다: 깊이 6단계(더 깊으면 [Object] 나 [Array(n)]), 객체 키 100개, 배열 항목 100개, 문자열 2000자, DOM 텍스트 노드 60자. 이 상한에 하나라도 걸리면 결과에 clipped 가 붙어 depth, keys, items, strings 별로 걸린 횟수와 처음 걸린 자리(paths, 최대 10개, 예: $.list[3].name)를 알려 준다. 그 뒤 JSON 전체가 maxChars 를 넘으면 잘라서 truncated 를 true 로 한다(truncated 는 maxChars 만 뜻한다). ctx.log 는 50줄, 줄마다 500자까지 남는다. 코드는 글을 바꿀 수도 있으니 읽기만 할 때는 바꾸지 않는 코드를 쓰고, 결과의 revisionBefore 와 revisionAfter 가 다르면 글이 바뀐 것이다. 바뀌었으면 editor_undo 나 editor_read_document 로 확인한다. 페이지가 문자열 코드 실행을 막으면 stage 가 eval-blocked 로 온다. 매번 사용자 확인을 받는다."
nav: "tools"
tool: "editor_debug"
generated: true
---

# 코드 실행(개발용)

`editor_debug` · 매번 물어봄 · 내 컴퓨터

개발용. 글쓰기 창 페이지 안에서 짧은 자바스크립트를 직접 실행하고 반환값을 돌려준다. 새 도구를 만들기 전에 에디터 내부 객체를 들여다보거나 가설을 시험할 때 쓴다. 코드는 async 함수의 본문이라 await 와 return 을 쓸 수 있고, 인자 하나 ctx 를 받는다. ctx.se 는 에디터 객체, ctx.controller 는 우리 컨트롤러, ctx.json() 은 문서 JSON, ctx.components() 는 컴포넌트 목록, ctx.sleep(ms) 는 기다림, ctx.log(...) 는 결과의 logs 에 줄을 남긴다. 반환값은 순환과 DOM 과 함수를 걸러 JSON 으로 바뀐다. 값마다 상한이 있다: 깊이 6단계(더 깊으면 [Object] 나 [Array(n)]), 객체 키 100개, 배열 항목 100개, 문자열 2000자, DOM 텍스트 노드 60자. 이 상한에 하나라도 걸리면 결과에 clipped 가 붙어 depth, keys, items, strings 별로 걸린 횟수와 처음 걸린 자리(paths, 최대 10개, 예: $.list[3].name)를 알려 준다. 그 뒤 JSON 전체가 maxChars 를 넘으면 잘라서 truncated 를 true 로 한다(truncated 는 maxChars 만 뜻한다). ctx.log 는 50줄, 줄마다 500자까지 남는다. 코드는 글을 바꿀 수도 있으니 읽기만 할 때는 바꾸지 않는 코드를 쓰고, 결과의 revisionBefore 와 revisionAfter 가 다르면 글이 바뀐 것이다. 바뀌었으면 editor_undo 나 editor_read_document 로 확인한다. 페이지가 문자열 코드 실행을 막으면 stage 가 eval-blocked 로 온다. 매번 사용자 확인을 받는다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `code` | 문자열 | O | 실행할 코드. async 함수의 본문이며 return 으로 값을 돌려준다. 예: return ctx.components().length |
| `timeoutMs` | 정수 | X | 실행을 기다리는 시간(ms). 기본 10000, 최대 18000. |
| `maxChars` | 정수 | X | 반환값을 JSON 으로 바꾼 글자 수 상한. 기본 20000. |

## 함께 쓰는 도구

- [실행 취소](/tools/editor-control/editor_undo/) `editor_undo`
- [문서 전체 읽기](/tools/editor-control/editor_read_document/) `editor_read_document`
- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`
- [문단 서식 적용](/tools/editor-detail/editor_set_paragraph_styles/) `editor_set_paragraph_styles`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
