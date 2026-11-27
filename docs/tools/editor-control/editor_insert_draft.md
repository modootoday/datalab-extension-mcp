---
layout: "dl-tool"
title: "에디터에 초안 삽입"
description: "마크다운 초안을 현재 글쓰기 창 에디터 본문에 삽입한다. 글을 작성/추가해 달라는 요청에 사용한다. 이미 작성된 내용이 있으면 사용자 확인을 거친다. write_draft 가 초안 참조(dr_...)를 돌려줬다면 본문을 다시 옮겨 적지 말고 artifactId 로 그 값을 넘겨라 — 제목도 함께 반영되므로 editor_set_title 을 따로 부를 필요가 없다. 결과의 titleApplied 가 제목을 어떻게 했는지 알려 준다(set=넣음 / kept-existing=이미 있어 그대로 / none=안 넣음). 🔴 제목을 본문 마크다운 안에 다시 적지 마라."
nav: "tools"
tool: "editor_insert_draft"
generated: true
---

# 에디터에 초안 삽입

`editor_insert_draft` · 매번 물어봄 · 내 컴퓨터

마크다운 초안을 현재 글쓰기 창 에디터 본문에 삽입한다. 글을 작성/추가해 달라는 요청에 사용한다. 이미 작성된 내용이 있으면 사용자 확인을 거친다. write_draft 가 초안 참조(dr_...)를 돌려줬다면 본문을 다시 옮겨 적지 말고 artifactId 로 그 값을 넘겨라 — 제목도 함께 반영되므로 editor_set_title 을 따로 부를 필요가 없다. 결과의 titleApplied 가 제목을 어떻게 했는지 알려 준다(set=넣음 / kept-existing=이미 있어 그대로 / none=안 넣음). 🔴 제목을 본문 마크다운 안에 다시 적지 마라.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `markdown` | 문자열 | X | 삽입할 본문 마크다운 (artifactId 를 쓰면 생략) |
| `artifactId` | 문자열 | X | write_draft 가 돌려준 초안 참조(dr_...). 본문을 대신한다. 그 초안의 제목도 함께 따라온다. |
| `title` | 문자열 | X | 글 제목 (선택). 제목이 비어 있을 때만 채우고, 이미 제목이 있으면 그대로 둔다. 제목만 바꾸려면 editor_set_title 을 쓴다. |
| `blankLines` | 문자열 | X | 선택. 마크다운의 빈 줄 처리. 기본 collapse 는 빈 줄을 버린다. preserve 는 문단 구분(빈 줄 1개)을 넘는 빈 줄을 빈 문단으로 남긴다. 예: 문단 사이에 빈 줄이 2개면 빈 문단 1개. 한 번에 최대 10개까지. |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [초안 작성](/tools/keyword-research/write_draft/) `write_draft`
- [제목 설정](/tools/editor-control/editor_set_title/) `editor_set_title`
- [내부 링크 제안](/tools/editor-control/internal_links/) `internal_links`
- [글쓰기 창 열기](/tools/editor-control/editor_open_window/) `editor_open_window`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
