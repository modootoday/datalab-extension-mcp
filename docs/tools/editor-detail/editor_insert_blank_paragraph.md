---
layout: "dl-tool"
title: "빈 줄 넣기"
description: "글쓰기 창 본문의 지정한 컴포넌트 앞이나 뒤에 빈 문단(빈 줄)을 넣는다. 이미지·소제목 앞뒤나 문단 사이에 간격이 필요할 때 쓴다. 기준 컴포넌트는 editor_read_document 가 돌려준 id 다. 넣은 뒤 목록에서 다시 읽어 요청한 위치에 들어갔는지 확인하고, 어긋나면 되돌리고 실패로 알린다. 돌려준 id 는 그 시점에만 유효하다 — 이후 삽입에서 편집기가 인접한 text 컴포넌트를 하나로 합칠 수 있으니 다음 쓰기 전에 editor_read_document 로 다시 읽는다. 새로 쓰는 마크다운 안의 빈 줄은 editor_insert_draft 의 blankLines: preserve 로 넣는다."
nav: "tools"
tool: "editor_insert_blank_paragraph"
generated: true
---

# 빈 줄 넣기

`editor_insert_blank_paragraph` · 매번 물어봄 · 내 컴퓨터

글쓰기 창 본문의 지정한 컴포넌트 앞이나 뒤에 빈 문단(빈 줄)을 넣는다. 이미지·소제목 앞뒤나 문단 사이에 간격이 필요할 때 쓴다. 기준 컴포넌트는 editor_read_document 가 돌려준 id 다. 넣은 뒤 목록에서 다시 읽어 요청한 위치에 들어갔는지 확인하고, 어긋나면 되돌리고 실패로 알린다. 돌려준 id 는 그 시점에만 유효하다 — 이후 삽입에서 편집기가 인접한 text 컴포넌트를 하나로 합칠 수 있으니 다음 쓰기 전에 editor_read_document 로 다시 읽는다. 새로 쓰는 마크다운 안의 빈 줄은 editor_insert_draft 의 blankLines: preserve 로 넣는다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `componentId` | 문자열 | O | 기준 컴포넌트 id (editor_read_document). |
| `position` | 문자열 | X | 기준 컴포넌트의 앞 또는 뒤. 기본 after. 제목 앞은 불가. |
| `count` | 정수 | X | 넣을 빈 문단 수. 기본 1. |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [문서 전체 읽기](/tools/editor-control/editor_read_document/) `editor_read_document`
- [에디터에 초안 삽입](/tools/editor-control/editor_insert_draft/) `editor_insert_draft`
- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`
- [문단 서식 적용](/tools/editor-detail/editor_set_paragraph_styles/) `editor_set_paragraph_styles`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
