---
layout: "dl-tool"
title: "본문 전체 교체"
description: "현재 글쓰기 창의 본문 '전체'를 새 마크다운으로 교체한다(제목은 유지). editor_read 로 읽은 글을 수정/재작성한 결과를 반영할 때 사용한다. 일부만 추가할 때는 editor_insert_draft 를 쓴다. 기존 내용이 있으면 사용자 확인을 거친다."
nav: "tools"
tool: "editor_replace"
generated: true
---

# 본문 전체 교체

`editor_replace` · 매번 물어봄 · 내 컴퓨터

현재 글쓰기 창의 본문 '전체'를 새 마크다운으로 교체한다(제목은 유지). editor_read 로 읽은 글을 수정/재작성한 결과를 반영할 때 사용한다. 일부만 추가할 때는 editor_insert_draft 를 쓴다. 기존 내용이 있으면 사용자 확인을 거친다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `markdown` | 문자열 | X | 본문 전체를 대체할 마크다운 (artifactId 를 쓰면 생략) |
| `artifactId` | 문자열 | X | 앞 단계에서 받은 초안 참조(dr_...). 본문을 대신한다. |
| `blankLines` | 문자열 | X | 선택. 마크다운의 빈 줄 처리. 기본 collapse 는 빈 줄을 버린다. preserve 는 문단 구분(빈 줄 1개)을 넘는 빈 줄을 빈 문단으로 남긴다. 예: 문단 사이에 빈 줄이 2개면 빈 문단 1개. 한 번에 최대 10개까지. |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [현재 글 읽기](/tools/editor-control/editor_read/) `editor_read`
- [에디터에 초안 삽입](/tools/editor-control/editor_insert_draft/) `editor_insert_draft`
- [내부 링크 제안](/tools/editor-control/internal_links/) `internal_links`
- [글쓰기 창 열기](/tools/editor-control/editor_open_window/) `editor_open_window`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
