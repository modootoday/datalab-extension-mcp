---
layout: "dl-tool"
title: "문단 서식 적용"
description: "글쓰기 창 본문의 문단 단위 서식(정렬 align, 행간 lineHeight, 첫글자 키우기 dropCap)을 건다. 문단은 editor_read_document 가 돌려준 componentId 와 문단 번호(paragraphIndex, 0부터)로 고르고, 글자 구간은 필요 없다. 규칙마다 요청한 값(requested)과 적용 뒤 문서를 다시 읽은 값(observed), 맞았는지(applied)를 돌려준다. 정렬은 문단이 실제로 보이는 값으로 판단하고 그 값과 출처를 effective.align 에 준다. 편집기는 기본 정렬(left)을 저장하지 않으므로, 테마가 다른 정렬을 정해 둔 문단에 left 를 요청하면 보내지 않고 theme-default-not-storable 로 거절하며 message 를 준다. 글자가 없는 빈 문단에는 걸 수 없다. 인용구는 정렬을 받지 않는다. 인용구의 정렬은 디자인(레이아웃)이 정하므로 정렬을 요청하면 unsupported-in-component 로 답하고, 바꾸려면 editor_update_component 로 디자인을 바꾼다. 인용구는 첫글자 키우기도 받지 않는다. 문단 앞뒤 간격과 들여쓰기 값은 이 도구에 없다. 간격이 필요하면 행간을 키우거나 editor_insert_blank_paragraph 로 빈 문단을 넣는다. 글자 단위 서식은 editor_apply_styles 를 쓴다. 표의 칸 안 문단에도 정렬, 행간, 첫글자 키우기를 걸 수 있다: componentId 에 표 id 를, cell 에 { row, col } 을 준다. 칸 번호 규칙과 거절은 editor_apply_styles 와 같다. 한 번 호출이 되돌리기 한 단계다. applied 가 false 인 규칙은 저장된 것이 아니다."
nav: "tools"
tool: "editor_set_paragraph_styles"
generated: true
---

# 문단 서식 적용

`editor_set_paragraph_styles` · 매번 물어봄 · 내 컴퓨터

글쓰기 창 본문의 문단 단위 서식(정렬 align, 행간 lineHeight, 첫글자 키우기 dropCap)을 건다. 문단은 editor_read_document 가 돌려준 componentId 와 문단 번호(paragraphIndex, 0부터)로 고르고, 글자 구간은 필요 없다. 규칙마다 요청한 값(requested)과 적용 뒤 문서를 다시 읽은 값(observed), 맞았는지(applied)를 돌려준다. 정렬은 문단이 실제로 보이는 값으로 판단하고 그 값과 출처를 effective.align 에 준다. 편집기는 기본 정렬(left)을 저장하지 않으므로, 테마가 다른 정렬을 정해 둔 문단에 left 를 요청하면 보내지 않고 theme-default-not-storable 로 거절하며 message 를 준다. 글자가 없는 빈 문단에는 걸 수 없다. 인용구는 정렬을 받지 않는다. 인용구의 정렬은 디자인(레이아웃)이 정하므로 정렬을 요청하면 unsupported-in-component 로 답하고, 바꾸려면 editor_update_component 로 디자인을 바꾼다. 인용구는 첫글자 키우기도 받지 않는다. 문단 앞뒤 간격과 들여쓰기 값은 이 도구에 없다. 간격이 필요하면 행간을 키우거나 editor_insert_blank_paragraph 로 빈 문단을 넣는다. 글자 단위 서식은 editor_apply_styles 를 쓴다. 표의 칸 안 문단에도 정렬, 행간, 첫글자 키우기를 걸 수 있다: componentId 에 표 id 를, cell 에 { row, col } 을 준다. 칸 번호 규칙과 거절은 editor_apply_styles 와 같다. 한 번 호출이 되돌리기 한 단계다. applied 가 false 인 규칙은 저장된 것이 아니다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `rules` | 목록 | O | 적용할 문단 서식 규칙 목록. 하나는 문단 하나와 그 서식이다. |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [문서 전체 읽기](/tools/editor-control/editor_read_document/) `editor_read_document`
- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`
- [빈 줄 넣기](/tools/editor-detail/editor_insert_blank_paragraph/) `editor_insert_blank_paragraph`
- [글자 서식 적용](/tools/editor-detail/editor_apply_styles/) `editor_apply_styles`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
