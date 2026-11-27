---
layout: "dl-tool"
title: "글 쓰기"
description: "글쓰기 창 본문의 한 문단 안 원하는 자리에 글을 쓰고, Enter 를 치고, 뒤따르는 글자를 지운다. 커서가 없어도 된다. 문단은 editor_read_document 의 componentId 와 문단 번호(paragraphIndex, 0부터)로 고르고, offset 은 그 문단 글자 기준 자리(0이면 맨 앞)이며 생략하면 문단 맨 뒤다. offset 과 erase 의 count 는 UTF-16 코드 단위로 센다(자바스크립트 문자열 length 와 같다). ops 는 차례대로 적용되고, 쓴 뒤 커서는 그 뒤를 따라간다: { kind: 'text', text } 는 글을 쓰고, { kind: 'enter' } 는 Enter 라서 문단 중간이면 그 자리에서 둘로 나뉘고 맨 앞이면 앞에 빈 문단이, 맨 뒤면 뒤에 빈 문단이 생긴다. 줄을 나누는 방법은 enter 하나다. { kind: 'erase', count } 는 커서에서 앞쪽(뒤따르는 글자)으로 count 글자를 지운다(그 문단 끝을 넘으면 아무것도 바꾸지 않고 거절한다). 글을 바꾸려면 erase 뒤에 text 를 이어 쓴다. 예: 문단 \"안녕하세요\" 전체를 \"반가워요\"로 바꾸려면 offset 0, ops [{ kind: 'erase', count: 5 }, { kind: 'text', text: '반가워요' }]. 한 번에 ops 20개, 글자 2000자까지. text 에는 줄바꿈, 제어 문자, 이모지를 넣을 수 없다(에디터가 이모지가 든 글에서 나머지를 버린다). 일반 본문 문단(text)과 표의 칸에 쓸 수 있고 제목, 소제목, 인용구는 거절한다. 표의 칸에 쓰려면 componentId 에 표 id 를, cell 에 { row, col }(0부터)을 주고 paragraphIndex 는 그 칸 안의 문단 번호다(칸이 비어 있어도 0). 쓴 뒤 그 컴포넌트의 문단 글자를 다시 읽어 요청한 결과와 정확히 같을 때만 성공으로 답하고, 다르면 되돌린다. 되돌린 거절에는 diagnosis(멈춘 단계 stage, 기대와 실제의 문단 수와 길이, 되돌렸는지, revision)가 글자 없이 숫자로만 붙는다. 글자 서식은 바꾸지 않는다. 되풀이 정책: operationId 를 주고 같은 인자로 다시 보내면 이미 적용된 결과를 그대로 돌려주고(replayed: true) 다시 쓰지 않는다. 같은 operationId 에 다른 인자면 operation_conflict, 아직 실행 중이면 operation_in_progress 로 거절한다. 거절되었거나 확인하지 못한 호출은 기록되지 않으므로 같은 operationId 로 다시 보내도 된다. operationId 없이 되풀이하면 글이 정말 두 번 들어가거나 두 번 지워진다. 응답이 끊기거나 불확실하면 다시 보내기 전에 editor_operation_status 로 확인한다."
nav: "tools"
tool: "editor_type_text"
generated: true
---

# 글 쓰기

`editor_type_text` · 매번 물어봄 · 내 컴퓨터

글쓰기 창 본문의 한 문단 안 원하는 자리에 글을 쓰고, Enter 를 치고, 뒤따르는 글자를 지운다. 커서가 없어도 된다. 문단은 editor_read_document 의 componentId 와 문단 번호(paragraphIndex, 0부터)로 고르고, offset 은 그 문단 글자 기준 자리(0이면 맨 앞)이며 생략하면 문단 맨 뒤다. offset 과 erase 의 count 는 UTF-16 코드 단위로 센다(자바스크립트 문자열 length 와 같다). ops 는 차례대로 적용되고, 쓴 뒤 커서는 그 뒤를 따라간다: { kind: 'text', text } 는 글을 쓰고, { kind: 'enter' } 는 Enter 라서 문단 중간이면 그 자리에서 둘로 나뉘고 맨 앞이면 앞에 빈 문단이, 맨 뒤면 뒤에 빈 문단이 생긴다. 줄을 나누는 방법은 enter 하나다. { kind: 'erase', count } 는 커서에서 앞쪽(뒤따르는 글자)으로 count 글자를 지운다(그 문단 끝을 넘으면 아무것도 바꾸지 않고 거절한다). 글을 바꾸려면 erase 뒤에 text 를 이어 쓴다. 예: 문단 "안녕하세요" 전체를 "반가워요"로 바꾸려면 offset 0, ops [{ kind: 'erase', count: 5 }, { kind: 'text', text: '반가워요' }]. 한 번에 ops 20개, 글자 2000자까지. text 에는 줄바꿈, 제어 문자, 이모지를 넣을 수 없다(에디터가 이모지가 든 글에서 나머지를 버린다). 일반 본문 문단(text)과 표의 칸에 쓸 수 있고 제목, 소제목, 인용구는 거절한다. 표의 칸에 쓰려면 componentId 에 표 id 를, cell 에 { row, col }(0부터)을 주고 paragraphIndex 는 그 칸 안의 문단 번호다(칸이 비어 있어도 0). 쓴 뒤 그 컴포넌트의 문단 글자를 다시 읽어 요청한 결과와 정확히 같을 때만 성공으로 답하고, 다르면 되돌린다. 되돌린 거절에는 diagnosis(멈춘 단계 stage, 기대와 실제의 문단 수와 길이, 되돌렸는지, revision)가 글자 없이 숫자로만 붙는다. 글자 서식은 바꾸지 않는다. 되풀이 정책: operationId 를 주고 같은 인자로 다시 보내면 이미 적용된 결과를 그대로 돌려주고(replayed: true) 다시 쓰지 않는다. 같은 operationId 에 다른 인자면 operation_conflict, 아직 실행 중이면 operation_in_progress 로 거절한다. 거절되었거나 확인하지 못한 호출은 기록되지 않으므로 같은 operationId 로 다시 보내도 된다. operationId 없이 되풀이하면 글이 정말 두 번 들어가거나 두 번 지워진다. 응답이 끊기거나 불확실하면 다시 보내기 전에 editor_operation_status 로 확인한다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `componentId` | 문자열 | O | 글을 쓸 본문 컴포넌트 id (editor_read_document). |
| `paragraphIndex` | 정수 | O | 그 컴포넌트 안 문단 번호, 0부터. |
| `offset` | 정수 | X | 문단 글자 기준 커서 자리. 0 은 맨 앞. 생략하면 문단 맨 뒤. |
| `cell` | 객체 | X | 선택. 표의 칸을 고를 때: componentId 는 표 id, cell 은 { row, col }(0부터 정수). 번호는 editor_read_document 의 table.rows[row].cells[col] 배열 번호 그대로다. 합친 칸은 남은 칸 하나가 colSpan·rowSpan 을 갖고 합쳐져 사라진 칸은 배열에서 빠지므로, 합친 줄에서는 col 이 화면의 열 번호가 아니라 배열에 남은 칸의 순서다. paragraphIndex 는 그 칸 안의 문단 번호다. 표가 아닌 컴포넌트에 cell 을 주거나 없는 칸이면 아무것도 바꾸지 않고 거절한다. |
| `ops` | 목록 | O | 차례대로 할 일. 커서는 앞 일이 끝난 자리에서 이어진다. |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [문서 전체 읽기](/tools/editor-control/editor_read_document/) `editor_read_document`
- [작업 적용 확인](/tools/editor-control/editor_operation_status/) `editor_operation_status`
- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`
- [문단 서식 적용](/tools/editor-detail/editor_set_paragraph_styles/) `editor_set_paragraph_styles`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
