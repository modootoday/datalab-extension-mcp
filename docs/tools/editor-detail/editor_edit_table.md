---
layout: "dl-tool"
title: "표 구조 바꾸기"
description: "글쓰기 창 본문의 표 구조를 바꾼다. 행 넣기(insert-row: 기준 칸 아래), 열 넣기(insert-column: 기준 칸 옆), 칸 합치기(merge: cell 과 to 를 모서리로 하는 사각형), 칸 나누기(split-row, split-column: 합쳐진 칸을 나눈다), 행 지우기(delete-row: 기준 칸이 있는 행), 열 지우기(delete-column: 기준 칸이 있는 열). 하나 남은 행이나 열은 지우지 않는다. 칸 너비 바꾸기(set-width: 기준 칸을 표의 width 퍼센트로, 이웃 칸이 따라 바뀐다). 표 id 는 editor_read_document, 칸은 0부터 센 행(row)과 열(col)로 고른다. 칸 안의 글은 editor_type_text 로 쓴다. 결과의 행·칸 개수를 읽어 확인하고, 요청대로 바뀌지 않으면 되돌린다."
nav: "tools"
tool: "editor_edit_table"
generated: true
---

# 표 구조 바꾸기

`editor_edit_table` · 매번 물어봄 · 내 컴퓨터

글쓰기 창 본문의 표 구조를 바꾼다. 행 넣기(insert-row: 기준 칸 아래), 열 넣기(insert-column: 기준 칸 옆), 칸 합치기(merge: cell 과 to 를 모서리로 하는 사각형), 칸 나누기(split-row, split-column: 합쳐진 칸을 나눈다), 행 지우기(delete-row: 기준 칸이 있는 행), 열 지우기(delete-column: 기준 칸이 있는 열). 하나 남은 행이나 열은 지우지 않는다. 칸 너비 바꾸기(set-width: 기준 칸을 표의 width 퍼센트로, 이웃 칸이 따라 바뀐다). 표 id 는 editor_read_document, 칸은 0부터 센 행(row)과 열(col)로 고른다. 칸 안의 글은 editor_type_text 로 쓴다. 결과의 행·칸 개수를 읽어 확인하고, 요청대로 바뀌지 않으면 되돌린다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `componentId` | 문자열 | O | 표 컴포넌트 id (editor_read_document). |
| `action` | 문자열 | O | 표 구조 동작. |
| `cell` | 객체 | O | 기준 칸 (0부터). |
| `to` | 객체 | X | merge 에서 cell 의 맞은편 모서리 칸. 다른 동작에서는 쓰지 않는다. |
| `width` | 숫자 | X | set-width 에서 기준 칸이 가질 너비, 표 전체에 대한 퍼센트. 예: 40. 오른쪽 이웃 칸이 그만큼 줄거나 늘고, 한 행의 맨 오른쪽 칸은 바꾸지 않는다. 다른 동작에서는 쓰지 않는다. |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [문서 전체 읽기](/tools/editor-control/editor_read_document/) `editor_read_document`
- [글 쓰기](/tools/editor-detail/editor_type_text/) `editor_type_text`
- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`
- [문단 서식 적용](/tools/editor-detail/editor_set_paragraph_styles/) `editor_set_paragraph_styles`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
