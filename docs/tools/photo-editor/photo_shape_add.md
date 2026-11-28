---
layout: "dl-tool"
title: "사진 편집기 — 도형 넣기"
description: "도형을 추가한다(사각형·원·선). 배경 박스나 구분선에 쓴다."
nav: "tools"
tool: "photo_shape_add"
generated: true
---

# 사진 편집기 — 도형 넣기

`photo_shape_add` · 매번 물어봄 · 내 컴퓨터

도형을 추가한다(사각형·원·선). 배경 박스나 구분선에 쓴다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `shape` | 문자열 | O | 그릴 도형 종류 |
| `fill` | 문자열 | X | 채움색 hex(예: '#03c75a') |
| `width` | 숫자 | X | 도형 가로 크기(px) |
| `height` | 숫자 | X | 도형 세로 크기(px) |
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

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
