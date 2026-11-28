---
layout: "dl-tool"
title: "편집기 창 정리 (하나만 남기고 닫기)"
description: "편집기 창을 정리하거나, 다음 글을 쓰려고 빈 편집기로 되돌린다. 무인 실행에서 다음 글을 이어 쓰려면 reuse-then-reset 이 맞다. 아무것도 닫지 않아 사용자 개입이 필요 없기 때문이다. 다른 mode 는 창 닫기를 시도하는데 닫기는 보장되지 않는다. 사용자가 그 탭에서 이리저리 이동했다면 브라우저가 스크립트의 창 닫기를 거부해 사용자가 직접 닫아야 하고, 무인 실행이 거기서 멈춘다. 결과의 newEditorReady 가 true 여야 빈 편집기가 준비된 것이다. still_multiple 이면 창이 아직 여럿이라 편집 도구가 계속 막히고, retryable 이 true 일 때만 다시 시도할 만하다. saveDisposition 이 unknown 이면 닫거나 전환하기 전 원고를 저장했는지 알 수 없다."
nav: "tools"
tool: "editor_reduce_windows"
generated: true
---

# 편집기 창 정리 (하나만 남기고 닫기)

`editor_reduce_windows` · 매번 물어봄 · 내 컴퓨터

편집기 창을 정리하거나, 다음 글을 쓰려고 빈 편집기로 되돌린다. 무인 실행에서 다음 글을 이어 쓰려면 reuse-then-reset 이 맞다. 아무것도 닫지 않아 사용자 개입이 필요 없기 때문이다. 다른 mode 는 창 닫기를 시도하는데 닫기는 보장되지 않는다. 사용자가 그 탭에서 이리저리 이동했다면 브라우저가 스크립트의 창 닫기를 거부해 사용자가 직접 닫아야 하고, 무인 실행이 거기서 멈춘다. 결과의 newEditorReady 가 true 여야 빈 편집기가 준비된 것이다. still_multiple 이면 창이 아직 여럿이라 편집 도구가 계속 막히고, retryable 이 true 일 때만 다시 시도할 만하다. saveDisposition 이 unknown 이면 닫거나 전환하기 전 원고를 저장했는지 알 수 없다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `surface` | 문자열 | O | 정리할 편집기 |
| `mode` | 문자열 | X | reuse-then-reset 은 바뀐 내용을 임시저장하고 같은 탭을 빈 글쓰기 편집기로 바꾸며 아무것도 닫지 않는다. keep-one(기본)은 보고 있는 창 하나만 남긴다. 나머지 둘은 이름 순서대로 닫고 연다. keep-one 외에는 글쓰기 창만 된다 |

## 함께 쓰는 도구

- [내부 링크 제안](/tools/editor-control/internal_links/) `internal_links`
- [글쓰기 창 열기](/tools/editor-control/editor_open_window/) `editor_open_window`
- [현재 글 읽기](/tools/editor-control/editor_read/) `editor_read`
- [본문 구조 읽기](/tools/editor-control/editor_read_structure/) `editor_read_structure`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
