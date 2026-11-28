---
layout: "dl-tool"
title: "사진 편집기 — 요소 고치기"
description: "요소의 속성을 바꾼다(이동·크기·회전·스타일·효과·필터·프레임 등). patch 에 바꿀 필드만 넣고, 효과 해제는 null 을 준다. 요소 종류에 없는 필드는 거부되니 photo_canvas_get 으로 종류를 먼저 확인한다. adjust·grade 는 준 객체가 기존 값을 통째로 대신하니, 일부만 바꿀 때는 photo_canvas_get 의 page.images[].look 을 읽고 합쳐서 보낸다."
nav: "tools"
tool: "photo_node_update"
generated: true
---

# 사진 편집기 — 요소 고치기

`photo_node_update` · 매번 물어봄 · 내 컴퓨터

요소의 속성을 바꾼다(이동·크기·회전·스타일·효과·필터·프레임 등). patch 에 바꿀 필드만 넣고, 효과 해제는 null 을 준다. 요소 종류에 없는 필드는 거부되니 photo_canvas_get 으로 종류를 먼저 확인한다. adjust·grade 는 준 객체가 기존 값을 통째로 대신하니, 일부만 바꿀 때는 photo_canvas_get 의 page.images[].look 을 읽고 합쳐서 보낸다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `ref` | 문자열 | O | photo_canvas_get 이 준 요소 ref(예: 't-3fa2') |
| `patch` | 객체 | O | 바꿀 필드만 담는 부분 갱신 객체(위치·크기·회전·텍스트·색상·효과·필터 등 요소 속성). null 을 주면 그 선택적 필드를 해제한다 |
| `page` | 문자열 | X | 요소가 있는 페이지 ref(예: 'p-c4d8'). 생략 시 활성 페이지 |
| `editor_session` | 문자열 | X | photo_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [사진 편집기 — 캔버스 확인](/tools/photo-editor/photo_canvas_get/) `photo_canvas_get`
- [사진 편집기 — 현재 프로젝트 확인](/tools/photo-editor/photo_project_get/) `photo_project_get`
- [사진 편집기 — 새 프로젝트 만들기](/tools/photo-editor/photo_project_new/) `photo_project_new`
- [사진 편집기 — 저장된 프로젝트 목록](/tools/photo-editor/photo_project_list/) `photo_project_list`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
