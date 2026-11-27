---
layout: "dl-tool"
title: "컴포넌트 삭제"
description: "글쓰기 창 본문에서 컴포넌트를 통째로 지운다. 문단, 이미지, 인용구, 구분선 등 id 로 고른 컴포넌트가 글에서 사라진다. 한 번에 20개까지. id 가 하나라도 없으면 아무것도 지우지 않는다. 제목은 지울 수 없고, 본문이 모두 비게 되는 요청도 거절한다. 응답의 deleted 에 지운 컴포넌트의 id, 종류, 글 앞부분(30자)이 들어 있다. 지우기 전에 복원 지점이 저장되고 editor_undo 로 되돌릴 수 있다. 빈 문단만 지우려면 editor_remove_blank_paragraph 를 쓴다. 지울 id 는 반드시 editor_read_document 로 방금 읽은 것이어야 하고, target.expectedRevision 을 함께 주면 글이 그 사이 바뀐 경우 지우지 않는다."
nav: "tools"
tool: "editor_delete_components"
generated: true
---

# 컴포넌트 삭제

`editor_delete_components` · 매번 물어봄 · 내 컴퓨터

글쓰기 창 본문에서 컴포넌트를 통째로 지운다. 문단, 이미지, 인용구, 구분선 등 id 로 고른 컴포넌트가 글에서 사라진다. 한 번에 20개까지. id 가 하나라도 없으면 아무것도 지우지 않는다. 제목은 지울 수 없고, 본문이 모두 비게 되는 요청도 거절한다. 응답의 deleted 에 지운 컴포넌트의 id, 종류, 글 앞부분(30자)이 들어 있다. 지우기 전에 복원 지점이 저장되고 editor_undo 로 되돌릴 수 있다. 빈 문단만 지우려면 editor_remove_blank_paragraph 를 쓴다. 지울 id 는 반드시 editor_read_document 로 방금 읽은 것이어야 하고, target.expectedRevision 을 함께 주면 글이 그 사이 바뀐 경우 지우지 않는다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `componentIds` | 목록 | O | 지울 컴포넌트 id 목록 (editor_read_document). |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [실행 취소](/tools/editor-control/editor_undo/) `editor_undo`
- [빈 줄 지우기](/tools/editor-detail/editor_remove_blank_paragraph/) `editor_remove_blank_paragraph`
- [문서 전체 읽기](/tools/editor-control/editor_read_document/) `editor_read_document`
- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
