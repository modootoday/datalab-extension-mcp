---
layout: "dl-tool"
title: "사진 편집기 — 배경 바꾸기"
description: "페이지 배경색을 바꾼다(null=투명). gradient 를 주면 색 위에 그라데이션을 칠한다."
nav: "tools"
tool: "photo_background_set"
generated: true
---

# 사진 편집기 — 배경 바꾸기

`photo_background_set` · 매번 물어봄 · 내 컴퓨터

페이지 배경색을 바꾼다(null=투명). gradient 를 주면 색 위에 그라데이션을 칠한다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `color` | 문자열 | O | 배경 hex 또는 null(투명) |
| `gradient` | 객체 | X | 배경 그라데이션. null=그라데이션을 지우고 단색으로. 생략=그라데이션은 그대로 |
| `image` | 객체 | X | 배경 사진. 페이지의 사진 요소 하나를 배경으로 깐다(그 요소는 지운다, keep_node=true 면 남긴다). null=배경 사진을 지운다. 생략=그대로. 갤러리 사진은 photo_image_add_from_gallery 로 먼저 넣은 뒤 그 ref 를 준다 |
| `page` | 문자열 | X | 배경을 바꿀 페이지 ref(예: 'p-c4d8'). 생략 시 활성 페이지 |
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
