---
layout: "dl-tool"
title: "글자 서식 적용"
description: "글쓰기 창 본문의 글자 구간에 글꼴·크기·굵게·기울임·밑줄·취소선·글자색·배경색·링크를 걸며 글자는 바뀌지 않는다. 문단 정렬과 행간이면 editor_set_paragraph_styles 를 쓴다. 구간은 본문 읽기 결과의 componentId 와 paragraphIndex, 문단 text 기준 [start, end) 로 고르고, 표의 칸 안이면 cell 을 주며 칸 하나라도 잘못되면 어떤 규칙도 적용하지 않는다. 인용구는 글꼴·취소선·배경색을 받지 않아 unsupported-in-component 로 답한다. 편집기가 기본 글꼴 nanumgothic 을 저장하지 않아 테마가 다른 글꼴을 정한 문단의 nanumgothic 요청은 theme-default-not-storable 로 거절한다. results 의 applied 는 다시 읽은 글자가 실제로 그렇게 보이는지이고 false 인 규칙은 저장되지 않은 것이며, 실제 글꼴과 출처는 effective.fontFamily 에 있다."
nav: "tools"
tool: "editor_apply_styles"
generated: true
---

# 글자 서식 적용

`editor_apply_styles` · 매번 물어봄 · 내 컴퓨터

글쓰기 창 본문의 글자 구간에 글꼴·크기·굵게·기울임·밑줄·취소선·글자색·배경색·링크를 걸며 글자는 바뀌지 않는다. 문단 정렬과 행간이면 editor_set_paragraph_styles 를 쓴다. 구간은 본문 읽기 결과의 componentId 와 paragraphIndex, 문단 text 기준 [start, end) 로 고르고, 표의 칸 안이면 cell 을 주며 칸 하나라도 잘못되면 어떤 규칙도 적용하지 않는다. 인용구는 글꼴·취소선·배경색을 받지 않아 unsupported-in-component 로 답한다. 편집기가 기본 글꼴 nanumgothic 을 저장하지 않아 테마가 다른 글꼴을 정한 문단의 nanumgothic 요청은 theme-default-not-storable 로 거절한다. results 의 applied 는 다시 읽은 글자가 실제로 그렇게 보이는지이고 false 인 규칙은 저장되지 않은 것이며, 실제 글꼴과 출처는 effective.fontFamily 에 있다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `rules` | 목록 | O | 적용할 서식 규칙 목록. 하나는 한 문단 안의 한 구간과 그 구간에 줄 서식이다. |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [문단 서식 적용](/tools/editor-detail/editor_set_paragraph_styles/) `editor_set_paragraph_styles`
- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`
- [간격 맞추기](/tools/editor-detail/editor_apply_layout/) `editor_apply_layout`
- [이미지 배치](/tools/editor-detail/editor_set_image_layout/) `editor_set_image_layout`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
