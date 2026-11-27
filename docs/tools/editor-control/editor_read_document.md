---
layout: "dl-tool"
title: "문서 전체 읽기"
description: "현재 글쓰기 창의 문서 전체를 순서대로 읽는다 — 제목, 컴포넌트별 id·종류, 문단별 텍스트·빈 문단(blank)·링크(표시 문구와 URL)·정렬·행간·글자 서식, 문단별 목록 종류(list.kind: decimal·bullet·none·other), 저장된 값이 없을 때 에디터가 보여 주는 값(effective.lineHeight·fontSizeCode 의 value 와 source: stored·theme·default·mixed — 키가 없으면 모르는 값), 일반 본문(text)·소제목(sectionTitle)·표 칸의 글자가 있는 문단의 글꼴과 정렬(effective.fontFamily·effective.align). 문단의 align 이 null 이거나 textStyle 에 fontFamily 가 없으면 그 문단에 저장된 값이 없다는 뜻이고 적용 실패를 뜻하지 않는다. 실제 값과 출처는 effective.fontFamily·effective.align 의 value 와 source 로 본다: stored 는 문단(글꼴은 모든 구간)에 저장된 값, mixed 는 구간마다 달라 value 가 null 이고 values 에 저장된 값 목록(null 은 저장 없는 구간), inherited 는 에디터의 그 컴포넌트 테마 값(표 칸은 일반 본문 테마를 따르지 않고 그 칸의 글자·문단·칸·표가 가진 테마 값), default 는 테마가 값을 주지 않을 때 실측한 기본값(일반 본문 nanumgothic·left), unknown 은 알 수 없어 value 가 null 이다(표 칸은 그 값들이 모두 비어 있으면 unknown). 이 값은 문서만 읽고 요청한 값을 되풀이하지 않으며 revision 에 들어가지 않는다. 이미지 src·캡션, 링크 카드 URL, 표의 행별 셀 값(table.rows[].cells[].text, 병합은 colSpan·rowSpan). 잘라 내지 않고 컴포넌트 단위로 페이지를 나눈다(offset, limit 기본 100, 최대 200). page.nextOffset 이 null 이 아니면 그 값으로 다시 불러 나머지를 읽는다. revision 은 제목과 본문 전체(페이지 무관)의 SHA-256 앞 16자로, 이미지 주소의 쿼리는 빼고 계산한다. 두 읽기의 revision 이 같으면 같은 문서다(새로고침 뒤에도). savedRevision 은 이 페이지에서 확인된 마지막 임시저장의 revision, dirty 는 그 저장 뒤 내용이 바뀌었는지이고, 이 페이지에서 확인된 저장이 없으면 둘 다 null(모름)이다.document.di 는 문서 DI 목록 점검(present, dif, count, 중복 번호 duplicateIndices, valid, reason)이고 원문은 싣지 않는다. document.shoppingConnect 는 쇼핑 커넥트 카드마다 저장될 문서에 들어 있는지(inJson), 상품명·스토어·상품 번호, 제휴 URL·단축 URL·서명이 있는지(boolean)다. document.formulas 는 수식마다 componentId·index·latex·분수 여부(fraction)·텍스트 줄 수(rows)·썸네일 크기와 주소가 있는지(srcPresent)다. 글쓰기 창이 없으면 needs_editor 상태와 reasonCode 로 답한다. 짧은 요약이 필요하면 editor_read 를 쓴다."
nav: "tools"
tool: "editor_read_document"
generated: true
---

# 문서 전체 읽기

`editor_read_document` · 바로 조회 · 내 컴퓨터

현재 글쓰기 창의 문서 전체를 순서대로 읽는다 — 제목, 컴포넌트별 id·종류, 문단별 텍스트·빈 문단(blank)·링크(표시 문구와 URL)·정렬·행간·글자 서식, 문단별 목록 종류(list.kind: decimal·bullet·none·other), 저장된 값이 없을 때 에디터가 보여 주는 값(effective.lineHeight·fontSizeCode 의 value 와 source: stored·theme·default·mixed — 키가 없으면 모르는 값), 일반 본문(text)·소제목(sectionTitle)·표 칸의 글자가 있는 문단의 글꼴과 정렬(effective.fontFamily·effective.align). 문단의 align 이 null 이거나 textStyle 에 fontFamily 가 없으면 그 문단에 저장된 값이 없다는 뜻이고 적용 실패를 뜻하지 않는다. 실제 값과 출처는 effective.fontFamily·effective.align 의 value 와 source 로 본다: stored 는 문단(글꼴은 모든 구간)에 저장된 값, mixed 는 구간마다 달라 value 가 null 이고 values 에 저장된 값 목록(null 은 저장 없는 구간), inherited 는 에디터의 그 컴포넌트 테마 값(표 칸은 일반 본문 테마를 따르지 않고 그 칸의 글자·문단·칸·표가 가진 테마 값), default 는 테마가 값을 주지 않을 때 실측한 기본값(일반 본문 nanumgothic·left), unknown 은 알 수 없어 value 가 null 이다(표 칸은 그 값들이 모두 비어 있으면 unknown). 이 값은 문서만 읽고 요청한 값을 되풀이하지 않으며 revision 에 들어가지 않는다. 이미지 src·캡션, 링크 카드 URL, 표의 행별 셀 값(table.rows[].cells[].text, 병합은 colSpan·rowSpan). 잘라 내지 않고 컴포넌트 단위로 페이지를 나눈다(offset, limit 기본 100, 최대 200). page.nextOffset 이 null 이 아니면 그 값으로 다시 불러 나머지를 읽는다. revision 은 제목과 본문 전체(페이지 무관)의 SHA-256 앞 16자로, 이미지 주소의 쿼리는 빼고 계산한다. 두 읽기의 revision 이 같으면 같은 문서다(새로고침 뒤에도). savedRevision 은 이 페이지에서 확인된 마지막 임시저장의 revision, dirty 는 그 저장 뒤 내용이 바뀌었는지이고, 이 페이지에서 확인된 저장이 없으면 둘 다 null(모름)이다.document.di 는 문서 DI 목록 점검(present, dif, count, 중복 번호 duplicateIndices, valid, reason)이고 원문은 싣지 않는다. document.shoppingConnect 는 쇼핑 커넥트 카드마다 저장될 문서에 들어 있는지(inJson), 상품명·스토어·상품 번호, 제휴 URL·단축 URL·서명이 있는지(boolean)다. document.formulas 는 수식마다 componentId·index·latex·분수 여부(fraction)·텍스트 줄 수(rows)·썸네일 크기와 주소가 있는지(srcPresent)다. 글쓰기 창이 없으면 needs_editor 상태와 reasonCode 로 답한다. 짧은 요약이 필요하면 editor_read 를 쓴다.

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

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
