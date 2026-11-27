---
layout: "dl-tool"
title: "빈 줄 지우기"
description: "글쓰기 창 본문에서 빈 문단만 지운다. 두 가지 방식 중 하나만 쓴다. (1) componentIds: 글자가 없는 독립 text 컴포넌트 id 목록. (2) componentId + paragraphIndexes: 한 text 컴포넌트 안에서 빈 문단의 번호(0부터) 목록 — editor_read_document 의 paragraphs[].blank 가 true 인 문단이다. 편집기는 연속한 text 를 하나로 합치므로 빈 줄은 대개 (2) 로 지운다. 내용이 있는 컴포넌트나 문단이 하나라도 섞이면 아무것도 지우지 않고 거절한다. 첫 문단(0번)과 본문이 전부 비게 되는 삭제도 거절한다. 지운 뒤 문단 번호가 당겨지므로 번호는 다시 읽어서 쓴다."
nav: "tools"
tool: "editor_remove_blank_paragraph"
generated: true
---

# 빈 줄 지우기

`editor_remove_blank_paragraph` · 매번 물어봄 · 내 컴퓨터

글쓰기 창 본문에서 빈 문단만 지운다. 두 가지 방식 중 하나만 쓴다. (1) componentIds: 글자가 없는 독립 text 컴포넌트 id 목록. (2) componentId + paragraphIndexes: 한 text 컴포넌트 안에서 빈 문단의 번호(0부터) 목록 — editor_read_document 의 paragraphs[].blank 가 true 인 문단이다. 편집기는 연속한 text 를 하나로 합치므로 빈 줄은 대개 (2) 로 지운다. 내용이 있는 컴포넌트나 문단이 하나라도 섞이면 아무것도 지우지 않고 거절한다. 첫 문단(0번)과 본문이 전부 비게 되는 삭제도 거절한다. 지운 뒤 문단 번호가 당겨지므로 번호는 다시 읽어서 쓴다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `componentIds` | 목록 | X | 방식 1. 지울 빈 독립 text 컴포넌트 id 목록. |
| `componentId` | 문자열 | X | 방식 2. 빈 문단이 들어 있는 text 컴포넌트 id. |
| `paragraphIndexes` | 목록 | X | 방식 2. 그 컴포넌트 안에서 지울 빈 문단 번호 목록(1 이상). |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [문서 전체 읽기](/tools/editor-control/editor_read_document/) `editor_read_document`
- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`
- [문단 서식 적용](/tools/editor-detail/editor_set_paragraph_styles/) `editor_set_paragraph_styles`
- [간격 맞추기](/tools/editor-detail/editor_apply_layout/) `editor_apply_layout`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
