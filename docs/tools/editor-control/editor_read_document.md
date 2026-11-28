---
layout: "dl-tool"
title: "문서 전체 읽기"
description: "현재 글쓰기 창의 문서 전체를 순서대로 읽는다. 제목과 컴포넌트별 id·종류, 문단의 텍스트·링크·정렬·행간·글자 서식·목록, 이미지·링크 카드·표 셀·수식·쇼핑 커넥트 카드를 싣고, 짧은 요약이 필요하면 editor_read 를 쓴다. 잘라 내지 않고 컴포넌트 단위로 나눠 읽으며(limit 최대 200) page.nextOffset 이 null 이 아니면 그 값으로 다시 불러 나머지를 읽는다. 아무것도 바꾸지 않고, 글쓰기 창이 없으면 needs_editor 로 답한다. 문단의 align 이 null 이거나 fontFamily 가 없으면 저장된 값이 없다는 뜻이지 적용 실패가 아니며, 에디터가 실제로 보여 주는 값과 출처는 effective 의 value·source 에 있다. 두 읽기의 revision 이 같으면 새로고침 뒤에도 같은 문서다. savedRevision 과 dirty 가 null 이면 이 페이지에서 확인된 저장이 없어 저장 여부를 모르는 것이다."
nav: "tools"
tool: "editor_read_document"
generated: true
---

# 문서 전체 읽기

`editor_read_document` · 바로 조회 · 내 컴퓨터

현재 글쓰기 창의 문서 전체를 순서대로 읽는다. 제목과 컴포넌트별 id·종류, 문단의 텍스트·링크·정렬·행간·글자 서식·목록, 이미지·링크 카드·표 셀·수식·쇼핑 커넥트 카드를 싣고, 짧은 요약이 필요하면 editor_read 를 쓴다. 잘라 내지 않고 컴포넌트 단위로 나눠 읽으며(limit 최대 200) page.nextOffset 이 null 이 아니면 그 값으로 다시 불러 나머지를 읽는다. 아무것도 바꾸지 않고, 글쓰기 창이 없으면 needs_editor 로 답한다. 문단의 align 이 null 이거나 fontFamily 가 없으면 저장된 값이 없다는 뜻이지 적용 실패가 아니며, 에디터가 실제로 보여 주는 값과 출처는 effective 의 value·source 에 있다. 두 읽기의 revision 이 같으면 새로고침 뒤에도 같은 문서다. savedRevision 과 dirty 가 null 이면 이 페이지에서 확인된 저장이 없어 저장 여부를 모르는 것이다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `offset` | 정수 | X | 몇 번째 본문 컴포넌트부터 읽을지(0부터). 기본 0. |
| `limit` | 정수 | X | 한 번에 읽을 컴포넌트 수. 기본 100. |

## 함께 쓰는 도구

- [현재 글 읽기](/tools/editor-control/editor_read/) `editor_read`
- [내부 링크 제안](/tools/editor-control/internal_links/) `internal_links`
- [글쓰기 창 열기](/tools/editor-control/editor_open_window/) `editor_open_window`
- [편집기 창 정리 (하나만 남기고 닫기)](/tools/editor-control/editor_reduce_windows/) `editor_reduce_windows`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
