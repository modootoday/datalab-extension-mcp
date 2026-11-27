---
layout: "dl-tool"
title: "목록 바꾸기"
description: "글쓰기 창 본문의 문단을 번호 목록이나 글머리 목록으로 바꾸거나 목록을 해제하며, 글은 바뀌지 않는다. 일반 본문 문단에만 쓸 수 있고, 문단은 본문 읽기 결과의 componentId 와 paragraphIndex 로 고르며 바꿀 문단마다 규칙 하나가 필요하다. 규칙은 kind(decimal·bullet·none)나 level 중 하나만 주고, level 은 이미 목록인 문단의 들여쓰기 단계를 Tab 으로 한 단계씩 맞추며 목록이 아닌 문단이면 not-in-list 로 거절한다. 편집기가 더 못 움직이면 reason 이 level-limit 이고 observedLevel 이 지금 단계다. applied 가 false 인 규칙은 다시 읽은 값이 요청과 다른 것이다."
nav: "tools"
tool: "editor_set_list"
generated: true
---

# 목록 바꾸기

`editor_set_list` · 매번 물어봄 · 내 컴퓨터

글쓰기 창 본문의 문단을 번호 목록이나 글머리 목록으로 바꾸거나 목록을 해제하며, 글은 바뀌지 않는다. 일반 본문 문단에만 쓸 수 있고, 문단은 본문 읽기 결과의 componentId 와 paragraphIndex 로 고르며 바꿀 문단마다 규칙 하나가 필요하다. 규칙은 kind(decimal·bullet·none)나 level 중 하나만 주고, level 은 이미 목록인 문단의 들여쓰기 단계를 Tab 으로 한 단계씩 맞추며 목록이 아닌 문단이면 not-in-list 로 거절한다. 편집기가 더 못 움직이면 reason 이 level-limit 이고 observedLevel 이 지금 단계다. applied 가 false 인 규칙은 다시 읽은 값이 요청과 다른 것이다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `rules` | 목록 | O | 문단마다 하나. 순서대로 적용된다. |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`
- [문단 서식 적용](/tools/editor-detail/editor_set_paragraph_styles/) `editor_set_paragraph_styles`
- [간격 맞추기](/tools/editor-detail/editor_apply_layout/) `editor_apply_layout`
- [이미지 배치](/tools/editor-detail/editor_set_image_layout/) `editor_set_image_layout`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
