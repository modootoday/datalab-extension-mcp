---
layout: "dl-tool"
title: "사진 편집기 — 글자 넣기"
description: "사진 편집기 캔버스에 텍스트를 추가한다(예: 'NEW! 흑임자 라떼 출시'). 제목 임팩트는 Black Han Sans, 손글씨 감성은 Nanum Pen Script."
nav: "tools"
tool: "photo_text_add"
generated: true
---

# 사진 편집기 — 글자 넣기

`photo_text_add` · 매번 물어봄 · 내 컴퓨터

사진 편집기 캔버스에 텍스트를 추가한다(예: 'NEW! 흑임자 라떼 출시'). 제목 임팩트는 Black Han Sans, 손글씨 감성은 Nanum Pen Script.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `text` | 문자열 | O | 넣을 문구 |
| `preset` | 문자열 | X | 타이포 프리셋. 생략 시 heading |
| `fontFamily` | 문자열 | X | 폰트(생략 시 프리셋 기본) |
| `fontSize` | 숫자 | X | 글자 크기(px) |
| `fill` | 문자열 | X | 글자색 hex(예: '#ffffff') |
| `align` | 문자열 | X | 가로 정렬 |
| `width` | 숫자 | X | 줄바꿈 폭(px) |
| `position` | 문자열 | X | 캔버스 내 배치 위치(예: 'top-center', 'center'). x/y 대신 쓰며, position 이 우선한다 |
| `x` | 숫자 | X | 좌상단 x(px). position 이 없을 때만 |
| `y` | 숫자 | X | 좌상단 y(px). position 이 없을 때만 |
| `page` | 문자열 | X | 대상 페이지 ref(예: 'p-c4d8'). 생략 시 활성 페이지 |
| `editor_session` | 문자열 | X | photo_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [사진 편집기 — 현재 프로젝트 확인](/tools/photo-editor/photo_project_get/) `photo_project_get`
- [사진 편집기 — 새 프로젝트 만들기](/tools/photo-editor/photo_project_new/) `photo_project_new`
- [사진 편집기 — 저장된 프로젝트 목록](/tools/photo-editor/photo_project_list/) `photo_project_list`
- [사진 편집기 — 저장된 프로젝트 열기](/tools/photo-editor/photo_project_open/) `photo_project_open`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
