---
layout: "dl-tool"
title: "인용구·구분선 넣기"
description: "글쓰기 창 본문의 기준 컴포넌트 앞이나 뒤에 인용구·구분선·소제목을 넣는다. 커서 위치와 상관없이 componentId 로 위치를 정하고, 넣은 뒤 목록을 다시 읽어 그 자리에 있는지 확인하며 어긋나면 되돌리고 거절한다. 기준 컴포넌트는 editor_read_document 가 돌려준 id 이고, 제목 앞에는 넣을 수 없다. 인용구와 소제목은 text 가 필요하고 구분선에는 줄 수 없다. 디자인 값: quotation: default, quotation_line, quotation_bubble, quotation_underline, quotation_postit, quotation_corner. horizontalLine: default, line1, line2, line3, line4, line5, line6, line7. sectionTitle: default kind 가 formula 이면 latex(1~500자)로 수식을 넣는다. 편집기의 수식 창에 넣어 확인한 뒤 넣고, 썸네일 업로드까지 기다린다. 같은 latex 의 수식이 이미 있으면 새로 넣지 않고 그 수식을 idempotent: true 로 돌려준다. 실패하면 수식 창을 취소하고 kind: formula-unconfirmed 와 reason 으로 답한다. 실패 응답의 identityChanged 가 true 이면 다음 쓰기 전에 반드시 editor_read_document 로 다시 읽는다. 응답의 formula 는 latex, 분수 여부(fraction), 텍스트 줄 수(rows), 썸네일 크기와 주소가 있는지(srcPresent)다. 기존 글과 이미지는 건드리지 않는다. 응답의 componentId 는 넣은 컴포넌트의 id 이고, 편집기가 합치는 경우에 대비해 다음 작업 전에 editor_read_document 로 다시 읽는다."
nav: "tools"
tool: "editor_insert_component"
generated: true
---

# 인용구·구분선 넣기

`editor_insert_component` · 매번 물어봄 · 내 컴퓨터

글쓰기 창 본문의 기준 컴포넌트 앞이나 뒤에 인용구·구분선·소제목을 넣는다. 커서 위치와 상관없이 componentId 로 위치를 정하고, 넣은 뒤 목록을 다시 읽어 그 자리에 있는지 확인하며 어긋나면 되돌리고 거절한다. 기준 컴포넌트는 editor_read_document 가 돌려준 id 이고, 제목 앞에는 넣을 수 없다. 인용구와 소제목은 text 가 필요하고 구분선에는 줄 수 없다. 디자인 값: quotation: default, quotation_line, quotation_bubble, quotation_underline, quotation_postit, quotation_corner. horizontalLine: default, line1, line2, line3, line4, line5, line6, line7. sectionTitle: default kind 가 formula 이면 latex(1~500자)로 수식을 넣는다. 편집기의 수식 창에 넣어 확인한 뒤 넣고, 썸네일 업로드까지 기다린다. 같은 latex 의 수식이 이미 있으면 새로 넣지 않고 그 수식을 idempotent: true 로 돌려준다. 실패하면 수식 창을 취소하고 kind: formula-unconfirmed 와 reason 으로 답한다. 실패 응답의 identityChanged 가 true 이면 다음 쓰기 전에 반드시 editor_read_document 로 다시 읽는다. 응답의 formula 는 latex, 분수 여부(fraction), 텍스트 줄 수(rows), 썸네일 크기와 주소가 있는지(srcPresent)다. 기존 글과 이미지는 건드리지 않는다. 응답의 componentId 는 넣은 컴포넌트의 id 이고, 편집기가 합치는 경우에 대비해 다음 작업 전에 editor_read_document 로 다시 읽는다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `componentId` | 문자열 | O | 기준 컴포넌트 id (editor_read_document). |
| `position` | 문자열 | X | 기준 컴포넌트의 앞(before) 또는 뒤(after). 기본 after. |
| `kind` | 문자열 | O | 넣을 컴포넌트 종류. |
| `latex` | 문자열 | X | kind 가 formula 일 때만 쓴다. 넣을 수식의 LaTeX. |
| `design` | 문자열 | X | 디자인 값. 기본 default. quotation: default, quotation_line, quotation_bubble, quotation_underline, quotation_postit, quotation_corner. horizontalLine: default, line1, line2, line3, line4, line5, line6, line7. sectionTitle: default |
| `text` | 문자열 | X | 인용구·소제목의 글. 인용구는 줄바꿈으로 여러 줄을 줄 수 있다. |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [문서 전체 읽기](/tools/editor-control/editor_read_document/) `editor_read_document`
- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`
- [문단 서식 적용](/tools/editor-detail/editor_set_paragraph_styles/) `editor_set_paragraph_styles`
- [간격 맞추기](/tools/editor-detail/editor_apply_layout/) `editor_apply_layout`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
