---
layout: "dl-tool"
title: "목록 바꾸기"
description: "글쓰기 창 본문의 문단을 번호 목록이나 글머리 목록으로 바꾸거나 목록을 해제한다. 글은 바뀌지 않는다. 문단은 editor_read_document 의 componentId 와 문단 번호(paragraphIndex, 0부터)로 고르고, 규칙마다 kind 는 decimal(번호), bullet(글머리), none(목록 해제) 중 하나다. 이 편집기는 그 밖의 값도 저장은 하지만 목록으로 그려 주지 않아서 세 가지만 받는다. 목록으로 바꿀 문단마다 규칙 하나가 필요하다. 규칙마다 요청한 종류(requested)와 적용 뒤 문단을 다시 읽은 종류(observed), 맞았는지(applied)를 돌려준다. 일반 본문 문단(text)에만 쓸 수 있다. 규칙은 kind 대신 level(0부터 8까지 정수)을 줄 수도 있다: 이미 목록인 문단의 단계(들여쓰기)를 그 값으로 맞춘다. 키보드의 Tab 과 Shift+Tab 으로 한 단계씩 움직이고, 편집기가 멈춘 곳에서 reason 이 level-limit 이 되며 observedLevel 이 지금 단계다. editor_read_document 의 list.level 로도 읽는다. 목록이 아닌 문단의 level 은 not-in-list 로 거절한다. 한 규칙에는 kind 와 level 중 하나만 쓴다."
nav: "tools"
tool: "editor_set_list"
generated: true
---

# 목록 바꾸기

`editor_set_list` · 매번 물어봄 · 내 컴퓨터

글쓰기 창 본문의 문단을 번호 목록이나 글머리 목록으로 바꾸거나 목록을 해제한다. 글은 바뀌지 않는다. 문단은 editor_read_document 의 componentId 와 문단 번호(paragraphIndex, 0부터)로 고르고, 규칙마다 kind 는 decimal(번호), bullet(글머리), none(목록 해제) 중 하나다. 이 편집기는 그 밖의 값도 저장은 하지만 목록으로 그려 주지 않아서 세 가지만 받는다. 목록으로 바꿀 문단마다 규칙 하나가 필요하다. 규칙마다 요청한 종류(requested)와 적용 뒤 문단을 다시 읽은 종류(observed), 맞았는지(applied)를 돌려준다. 일반 본문 문단(text)에만 쓸 수 있다. 규칙은 kind 대신 level(0부터 8까지 정수)을 줄 수도 있다: 이미 목록인 문단의 단계(들여쓰기)를 그 값으로 맞춘다. 키보드의 Tab 과 Shift+Tab 으로 한 단계씩 움직이고, 편집기가 멈춘 곳에서 reason 이 level-limit 이 되며 observedLevel 이 지금 단계다. editor_read_document 의 list.level 로도 읽는다. 목록이 아닌 문단의 level 은 not-in-list 로 거절한다. 한 규칙에는 kind 와 level 중 하나만 쓴다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `rules` | 목록 | O | 문단마다 하나. 순서대로 적용된다. |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [문서 전체 읽기](/tools/editor-control/editor_read_document/) `editor_read_document`
- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`
- [문단 서식 적용](/tools/editor-detail/editor_set_paragraph_styles/) `editor_set_paragraph_styles`
- [간격 맞추기](/tools/editor-detail/editor_apply_layout/) `editor_apply_layout`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
