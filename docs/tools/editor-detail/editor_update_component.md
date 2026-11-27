---
layout: "dl-tool"
title: "컴포넌트 고치기"
description: "글쓰기 창 본문의 기존 컴포넌트를 고친다. 세 가지 중 하나만 한다. (1) convertTo: 문단 하나를 소제목(sectionTitle)이나 인용구(quotation)로 바꾸거나 본문(text)으로 되돌린다. componentId 와 문단 번호(paragraphIndex, 0부터)가 필요하다. (2) design: 인용구·구분선·소제목의 디자인을 바꾼다. 디자인 값: quotation: default, quotation_line, quotation_bubble, quotation_underline, quotation_postit, quotation_corner. horizontalLine: default, line1, line2, line3, line4, line5, line6, line7. sectionTitle: default. (3) aiMark: 이미지 컴포넌트의 'AI 활용' 표시를 켜거나(true) 끈다(false). 이미지가 아니면 거절하고, 이미 그 값이면 바꾸지 않고 idempotent: true 로 답한다. 그 표시 말고 문서의 다른 부분이 바뀌면 되돌리고 거절한다. 본문 글, 이미지, 링크, 컴포넌트 순서는 바뀌지 않아야 하고, 바뀌면 되돌리고 거절한다. 응답의 before 와 after 는 고친 컴포넌트의 전후 모습이고 preserved 는 무엇이 그대로인지 알려 준다. 편집기가 컴포넌트를 새로 만들어 id 가 바뀔 수 있으니 다음 작업 전에 editor_read_document 로 다시 읽는다. 글자가 없는 빈 문단은 바꿀 수 없다."
nav: "tools"
tool: "editor_update_component"
generated: true
---

# 컴포넌트 고치기

`editor_update_component` · 매번 물어봄 · 내 컴퓨터

글쓰기 창 본문의 기존 컴포넌트를 고친다. 세 가지 중 하나만 한다. (1) convertTo: 문단 하나를 소제목(sectionTitle)이나 인용구(quotation)로 바꾸거나 본문(text)으로 되돌린다. componentId 와 문단 번호(paragraphIndex, 0부터)가 필요하다. (2) design: 인용구·구분선·소제목의 디자인을 바꾼다. 디자인 값: quotation: default, quotation_line, quotation_bubble, quotation_underline, quotation_postit, quotation_corner. horizontalLine: default, line1, line2, line3, line4, line5, line6, line7. sectionTitle: default. (3) aiMark: 이미지 컴포넌트의 'AI 활용' 표시를 켜거나(true) 끈다(false). 이미지가 아니면 거절하고, 이미 그 값이면 바꾸지 않고 idempotent: true 로 답한다. 그 표시 말고 문서의 다른 부분이 바뀌면 되돌리고 거절한다. 본문 글, 이미지, 링크, 컴포넌트 순서는 바뀌지 않아야 하고, 바뀌면 되돌리고 거절한다. 응답의 before 와 after 는 고친 컴포넌트의 전후 모습이고 preserved 는 무엇이 그대로인지 알려 준다. 편집기가 컴포넌트를 새로 만들어 id 가 바뀔 수 있으니 다음 작업 전에 editor_read_document 로 다시 읽는다. 글자가 없는 빈 문단은 바꿀 수 없다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `componentId` | 문자열 | O | editor_read_document 의 컴포넌트 id. |
| `paragraphIndex` | 정수 | X | convertTo 와 함께 쓴다. 그 컴포넌트 안 문단 번호, 0부터. |
| `convertTo` | 문자열 | X | 문단을 바꿀 형식. design 과 함께 줄 수 없다. |
| `design` | 문자열 | X | 바꿀 디자인 값. convertTo 와 함께 줄 수 없다. quotation: default, quotation_line, quotation_bubble, quotation_underline, quotation_postit, quotation_corner. horizontalLine: default, line1, line2, line3, line4, line5, line6, line7. sectionTitle: default |
| `aiMark` | 참/거짓 | X | 이미지의 AI 활용 표시. 이미지 컴포넌트에만 쓰고 convertTo·design 과 함께 줄 수 없다. |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [문서 전체 읽기](/tools/editor-control/editor_read_document/) `editor_read_document`
- [문단 서식 적용](/tools/editor-detail/editor_set_paragraph_styles/) `editor_set_paragraph_styles`
- [간격 맞추기](/tools/editor-detail/editor_apply_layout/) `editor_apply_layout`
- [이미지 배치](/tools/editor-detail/editor_set_image_layout/) `editor_set_image_layout`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
