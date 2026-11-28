---
layout: "dl-tool"
title: "문단 서식 적용"
description: "글쓰기 창 본문의 문단 단위 서식(정렬, 행간, 첫글자 키우기)을 건다. 문단은 본문 읽기 결과의 componentId 와 paragraphIndex 로 고르고, 표의 칸 안 문단은 componentId 에 표 id 를, cell 에 { row, col } 을 준다. 글자 단위 서식이면 editor_apply_styles 를 쓴다. 문단 앞뒤 간격과 들여쓰기는 없어 간격은 행간이나 빈 문단으로 만든다. 글자가 없는 빈 문단에는 걸 수 없고, 인용구는 정렬과 첫글자 키우기를 받지 않아 unsupported-in-component 로 답하며 인용구 정렬은 editor_update_component 로 디자인을 바꿔야 달라진다. 편집기가 기본 정렬 left 를 저장하지 않아 테마가 다른 정렬을 정한 문단의 left 요청은 theme-default-not-storable 로 거절한다. 한 번 호출이 되돌리기 한 단계다. applied 가 false 인 규칙은 저장되지 않은 것이다."
nav: "tools"
tool: "editor_set_paragraph_styles"
generated: true
---

# 문단 서식 적용

`editor_set_paragraph_styles` · 매번 물어봄 · 내 컴퓨터

글쓰기 창 본문의 문단 단위 서식(정렬, 행간, 첫글자 키우기)을 건다. 문단은 본문 읽기 결과의 componentId 와 paragraphIndex 로 고르고, 표의 칸 안 문단은 componentId 에 표 id 를, cell 에 { row, col } 을 준다. 글자 단위 서식이면 editor_apply_styles 를 쓴다. 문단 앞뒤 간격과 들여쓰기는 없어 간격은 행간이나 빈 문단으로 만든다. 글자가 없는 빈 문단에는 걸 수 없고, 인용구는 정렬과 첫글자 키우기를 받지 않아 unsupported-in-component 로 답하며 인용구 정렬은 editor_update_component 로 디자인을 바꿔야 달라진다. 편집기가 기본 정렬 left 를 저장하지 않아 테마가 다른 정렬을 정한 문단의 left 요청은 theme-default-not-storable 로 거절한다. 한 번 호출이 되돌리기 한 단계다. applied 가 false 인 규칙은 저장되지 않은 것이다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `rules` | 목록 | O | 적용할 문단 서식 규칙 목록. 하나는 문단 하나와 그 서식이다. |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [글자 서식 적용](/tools/editor-detail/editor_apply_styles/) `editor_apply_styles`
- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`
- [간격 맞추기](/tools/editor-detail/editor_apply_layout/) `editor_apply_layout`
- [이미지 배치](/tools/editor-detail/editor_set_image_layout/) `editor_set_image_layout`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
