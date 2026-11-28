---
layout: "dl-tool"
title: "사진 편집기 — 캔버스 확인"
description: "현재 캔버스 구성을 확인한다. 페이지 목록과 활성 페이지의 모든 요소를 ref·종류·위치·크기와 함께 주며, 편집 전에 먼저 불러 요소 ref 를 알아 둔다. 아무것도 바꾸지 않는다. 사진 요소는 page.images 에 원본·자르기·그려지는 영역과 지금 보이는 모습 look 을 주고, look 의 null 은 설정하지 않았다는 뜻이다. subject 를 주고 넣은 사진은 subjectBounds 를, measure 일 때는 그 영역을 가리는 글자 ref 도 준다. canvasPreset 의 safeAreas 는 문서에도 내보내기에도 없는 안내 영역이고, 요소가 그 안에 있는지 판정하지 않는다."
nav: "tools"
tool: "photo_canvas_get"
generated: true
---

# 사진 편집기 — 캔버스 확인

`photo_canvas_get` · 바로 조회 · 내 컴퓨터

현재 캔버스 구성을 확인한다. 페이지 목록과 활성 페이지의 모든 요소를 ref·종류·위치·크기와 함께 주며, 편집 전에 먼저 불러 요소 ref 를 알아 둔다. 아무것도 바꾸지 않는다. 사진 요소는 page.images 에 원본·자르기·그려지는 영역과 지금 보이는 모습 look 을 주고, look 의 null 은 설정하지 않았다는 뜻이다. subject 를 주고 넣은 사진은 subjectBounds 를, measure 일 때는 그 영역을 가리는 글자 ref 도 준다. canvasPreset 의 safeAreas 는 문서에도 내보내기에도 없는 안내 영역이고, 요소가 그 안에 있는지 판정하지 않는다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `page` | 문자열 | X | 볼 페이지 ref. 생략 시 활성 페이지 |
| `measure` | 참/거짓 | X | true 면 글자 요소마다 렌더러가 잰 줄바꿈·실제 글꼴·영역·넘침·겹침을 page.measure 에 붙인다. fallbackGlyphs 는 다른 글꼴로 그려지는 글자이고 null 이면 판별하지 못한 것이다. 글꼴 로딩을 기다려 느리다 |
| `editor_session` | 문자열 | X | photo_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [사진 편집기 — 현재 프로젝트 확인](/tools/photo-editor/photo_project_get/) `photo_project_get`
- [사진 편집기 — 새 프로젝트 만들기](/tools/photo-editor/photo_project_new/) `photo_project_new`
- [사진 편집기 — 저장된 프로젝트 목록](/tools/photo-editor/photo_project_list/) `photo_project_list`
- [사진 편집기 — 저장된 프로젝트 열기](/tools/photo-editor/photo_project_open/) `photo_project_open`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
