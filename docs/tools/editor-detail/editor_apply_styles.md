---
layout: "dl-tool"
title: "글자 서식 적용"
description: "글쓰기 창 본문의 글자 구간에 서식을 건다. 한 문단 안에서 구간마다 글꼴·크기·굵게·기울임·밑줄·취소선·글자색·배경색·링크를 다르게 줄 수 있다. 문단 정렬과 행간은 editor_set_paragraph_styles 로 한다. 구간은 editor_read_document 가 돌려준 componentId 와 그 컴포넌트의 문단 번호(paragraphIndex, 0부터), 문단 text 기준 글자 위치 [start, end) 로 고른다. 규칙은 순서대로 적용되고, 각 규칙은 적용 뒤 다시 읽어 실제로 걸렸는지 results 의 applied 로 알려 준다. 글꼴은 저장된 값이 아니라 그 구간 글자가 실제로 보이는 값으로 판단한다: applied 가 true 이면 구간의 모든 글자가 요청한 글꼴로 보인다는 뜻이고, 그 값과 출처는 results 의 effective.fontFamily 에 있다. 편집기는 기본 글꼴(nanumgothic)을 저장하지 않으므로, 테마가 다른 글꼴을 정해 둔 문단에 nanumgothic 을 요청하면 보내지 않고 theme-default-not-storable 로 거절하며 message 와 지금 보이는 effective 를 함께 준다. 글자는 바뀌지 않는다. 표 칸은 일반 본문 테마가 아니라 그 칸이 가진 테마 값으로 판단하고, 거절 판단과 적용 뒤 판정이 같은 값을 읽는다. 처음에 값을 알 수 없던 칸에 편집기가 글꼴을 저장하면 applied: true(source stored)이고, 같은 상태의 소제목처럼 편집기가 값을 버리면 not-applied 로 남는다. 인용구는 글꼴, 취소선, 배경색을 받지 않아 그 서식을 요청하면 보내지 않고 unsupported-in-component 로 답한다. 서식이 섞인 문단은 editor_read_document 의 runs 로 구간별 실제 값을 확인한다. runs 에 fontFamily 가 없으면 저장된 글꼴이 없다는 뜻이고, 실제 글꼴과 출처는 editor_read_document 의 effective.fontFamily 로 본다. 표의 칸 안 글자에도 걸 수 있다: componentId 에 표 id 를, cell 에 { row, col } 을 주고 paragraphIndex 와 [start, end) 는 그 칸 안에서 센다. 칸 번호 규칙은 cell 설명에 있고, 칸 하나라도 잘못되면 어떤 규칙도 적용하지 않고 거절한다. applied 가 false 인 규칙은 저장된 것이 아니다."
nav: "tools"
tool: "editor_apply_styles"
generated: true
---

# 글자 서식 적용

`editor_apply_styles` · 매번 물어봄 · 내 컴퓨터

글쓰기 창 본문의 글자 구간에 서식을 건다. 한 문단 안에서 구간마다 글꼴·크기·굵게·기울임·밑줄·취소선·글자색·배경색·링크를 다르게 줄 수 있다. 문단 정렬과 행간은 editor_set_paragraph_styles 로 한다. 구간은 editor_read_document 가 돌려준 componentId 와 그 컴포넌트의 문단 번호(paragraphIndex, 0부터), 문단 text 기준 글자 위치 [start, end) 로 고른다. 규칙은 순서대로 적용되고, 각 규칙은 적용 뒤 다시 읽어 실제로 걸렸는지 results 의 applied 로 알려 준다. 글꼴은 저장된 값이 아니라 그 구간 글자가 실제로 보이는 값으로 판단한다: applied 가 true 이면 구간의 모든 글자가 요청한 글꼴로 보인다는 뜻이고, 그 값과 출처는 results 의 effective.fontFamily 에 있다. 편집기는 기본 글꼴(nanumgothic)을 저장하지 않으므로, 테마가 다른 글꼴을 정해 둔 문단에 nanumgothic 을 요청하면 보내지 않고 theme-default-not-storable 로 거절하며 message 와 지금 보이는 effective 를 함께 준다. 글자는 바뀌지 않는다. 표 칸은 일반 본문 테마가 아니라 그 칸이 가진 테마 값으로 판단하고, 거절 판단과 적용 뒤 판정이 같은 값을 읽는다. 처음에 값을 알 수 없던 칸에 편집기가 글꼴을 저장하면 applied: true(source stored)이고, 같은 상태의 소제목처럼 편집기가 값을 버리면 not-applied 로 남는다. 인용구는 글꼴, 취소선, 배경색을 받지 않아 그 서식을 요청하면 보내지 않고 unsupported-in-component 로 답한다. 서식이 섞인 문단은 editor_read_document 의 runs 로 구간별 실제 값을 확인한다. runs 에 fontFamily 가 없으면 저장된 글꼴이 없다는 뜻이고, 실제 글꼴과 출처는 editor_read_document 의 effective.fontFamily 로 본다. 표의 칸 안 글자에도 걸 수 있다: componentId 에 표 id 를, cell 에 { row, col } 을 주고 paragraphIndex 와 [start, end) 는 그 칸 안에서 센다. 칸 번호 규칙은 cell 설명에 있고, 칸 하나라도 잘못되면 어떤 규칙도 적용하지 않고 거절한다. applied 가 false 인 규칙은 저장된 것이 아니다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `rules` | 목록 | O | 적용할 서식 규칙 목록. 하나는 한 문단 안의 한 구간과 그 구간에 줄 서식이다. |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [문단 서식 적용](/tools/editor-detail/editor_set_paragraph_styles/) `editor_set_paragraph_styles`
- [문서 전체 읽기](/tools/editor-control/editor_read_document/) `editor_read_document`
- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`
- [간격 맞추기](/tools/editor-detail/editor_apply_layout/) `editor_apply_layout`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
