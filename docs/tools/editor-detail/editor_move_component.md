---
layout: "dl-tool"
title: "컴포넌트 이동"
description: "글쓰기 창 본문에서 컴포넌트 하나의 순서를 바꾼다. 내용은 건드리지 않는다. 두 가지 중 하나로 위치를 정한다. (1) toComponentId 와 position: 그 컴포넌트의 앞(before)이나 뒤(after)로 옮긴다. (2) direction 과 steps: 위(up)나 아래(down)로 steps 칸 옮긴다, 기본 1칸, 최대 100칸. 제목은 옮길 수 없고 제목보다 위로도 못 간다. 같은 자리면 바꾸지 않고 unchanged 로 답한다. 옮긴 뒤 순서를 다시 읽어 요청과 다르면 원래 자리로 돌려놓고 거절한다. 응답의 order 는 옮긴 뒤 컴포넌트 id 순서다. 컴포넌트 id 는 editor_read_document 로 읽는다."
nav: "tools"
tool: "editor_move_component"
generated: true
---

# 컴포넌트 이동

`editor_move_component` · 매번 물어봄 · 내 컴퓨터

글쓰기 창 본문에서 컴포넌트 하나의 순서를 바꾼다. 내용은 건드리지 않는다. 두 가지 중 하나로 위치를 정한다. (1) toComponentId 와 position: 그 컴포넌트의 앞(before)이나 뒤(after)로 옮긴다. (2) direction 과 steps: 위(up)나 아래(down)로 steps 칸 옮긴다, 기본 1칸, 최대 100칸. 제목은 옮길 수 없고 제목보다 위로도 못 간다. 같은 자리면 바꾸지 않고 unchanged 로 답한다. 옮긴 뒤 순서를 다시 읽어 요청과 다르면 원래 자리로 돌려놓고 거절한다. 응답의 order 는 옮긴 뒤 컴포넌트 id 순서다. 컴포넌트 id 는 editor_read_document 로 읽는다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `componentId` | 문자열 | O | 옮길 컴포넌트 id (editor_read_document). |
| `toComponentId` | 문자열 | X | 기준 컴포넌트 id. position 과 함께 쓴다. direction 과 함께 줄 수 없다. |
| `position` | 문자열 | X | 기준 컴포넌트의 앞인지 뒤인지. 기본은 after. |
| `direction` | 문자열 | X | 한 칸씩 옮길 방향. toComponentId 와 함께 줄 수 없다. |
| `steps` | 정수 | X | direction 과 함께 쓴다. 옮길 칸 수, 기본 1. |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [문서 전체 읽기](/tools/editor-control/editor_read_document/) `editor_read_document`
- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`
- [문단 서식 적용](/tools/editor-detail/editor_set_paragraph_styles/) `editor_set_paragraph_styles`
- [간격 맞추기](/tools/editor-detail/editor_apply_layout/) `editor_apply_layout`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
