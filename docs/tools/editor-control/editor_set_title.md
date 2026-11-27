---
layout: "dl-tool"
title: "제목 설정"
description: "현재 글쓰기 창의 글 제목을 설정한다. 이미 제목이 있으면 사용자 확인을 거친다."
nav: "tools"
tool: "editor_set_title"
generated: true
---

# 제목 설정

`editor_set_title` · 매번 물어봄 · 내 컴퓨터

현재 글쓰기 창의 글 제목을 설정한다. 이미 제목이 있으면 사용자 확인을 거친다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `title` | 문자열 | O | 글 제목. 줄바꿈 없는 한 줄, 120자 이내여야 하고 이 값이 기존 제목보다 우선한다. 본문을 여기에 넣으면 거절된다 — 본문은 editor_insert_draft 로 넣어라. |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [내부 링크 제안](/tools/editor-control/internal_links/) `internal_links`
- [글쓰기 창 열기](/tools/editor-control/editor_open_window/) `editor_open_window`
- [편집기 창 정리 (하나만 남기고 닫기)](/tools/editor-control/editor_reduce_windows/) `editor_reduce_windows`
- [현재 글 읽기](/tools/editor-control/editor_read/) `editor_read`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
