---
layout: "dl-tool"
title: "글 쓰기"
description: "글쓰기 창 본문의 한 문단 안 원하는 자리에 글을 쓰고, Enter 를 치고, 뒤따르는 글자를 지우며 서식은 바꾸지 않는다. 문단은 본문 읽기 결과의 componentId 와 paragraphIndex 로 고르고 offset 은 UTF-16 단위다. 글을 바꾸려면 erase 뒤에 text 를 잇고 줄은 enter 로만 나눈다. 한 번에 ops 20개, 글자 2000자까지, text 에 줄바꿈·제어 문자·이모지는 안 된다. 표의 칸에 쓰고 제목·소제목·인용구는 거절한다. 다시 읽어 요청과 다르면 되돌린다. operationId 없이 되풀이하면 두 번 적용된다. 같은 id·인자면 replayed, 다른 인자면 operation_conflict, 실행 중이면 operation_in_progress 이고, 거절된 호출은 기록되지 않아 같은 id 로 다시 보내도 된다. 응답이 끊기면 editor_operation_status 로 먼저 확인한다."
nav: "tools"
tool: "editor_type_text"
generated: true
---

# 글 쓰기

`editor_type_text` · 매번 물어봄 · 내 컴퓨터

글쓰기 창 본문의 한 문단 안 원하는 자리에 글을 쓰고, Enter 를 치고, 뒤따르는 글자를 지우며 서식은 바꾸지 않는다. 문단은 본문 읽기 결과의 componentId 와 paragraphIndex 로 고르고 offset 은 UTF-16 단위다. 글을 바꾸려면 erase 뒤에 text 를 잇고 줄은 enter 로만 나눈다. 한 번에 ops 20개, 글자 2000자까지, text 에 줄바꿈·제어 문자·이모지는 안 된다. 표의 칸에 쓰고 제목·소제목·인용구는 거절한다. 다시 읽어 요청과 다르면 되돌린다. operationId 없이 되풀이하면 두 번 적용된다. 같은 id·인자면 replayed, 다른 인자면 operation_conflict, 실행 중이면 operation_in_progress 이고, 거절된 호출은 기록되지 않아 같은 id 로 다시 보내도 된다. 응답이 끊기면 editor_operation_status 로 먼저 확인한다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `componentId` | 문자열 | O | 글을 쓸 본문 컴포넌트 id (editor_read_document). |
| `paragraphIndex` | 정수 | O | 그 컴포넌트 안 문단 번호, 0부터. |
| `offset` | 정수 | X | 문단 글자 기준 커서 자리. 0 은 맨 앞. 생략하면 문단 맨 뒤. |
| `cell` | 객체 | X | 선택. 표의 칸: componentId 는 표 id, paragraphIndex 는 칸 안 문단 번호. 번호는 본문 읽기의 table.rows[row].cells[col] 그대로라 합친 칸이 빠진 줄의 col 은 화면 열이 아니다. 표가 아니거나 없는 칸이면 거절한다. |
| `ops` | 목록 | O | 차례대로 할 일. 커서는 앞 일이 끝난 자리에서 이어진다. |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [작업 적용 확인](/tools/editor-control/editor_operation_status/) `editor_operation_status`
- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`
- [문단 서식 적용](/tools/editor-detail/editor_set_paragraph_styles/) `editor_set_paragraph_styles`
- [간격 맞추기](/tools/editor-detail/editor_apply_layout/) `editor_apply_layout`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
