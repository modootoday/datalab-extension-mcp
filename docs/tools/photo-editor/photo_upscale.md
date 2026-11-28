---
layout: "dl-tool"
title: "사진 편집기 — 2배 선명하게"
description: "사진 요소를 가로세로 2배로 선명하게 키운다(초해상도). 브라우저 안에서 돌고 무료다. 처음 한 번 모델(8MB)을 받고, 큰 사진은 수십 초 걸릴 수 있다. 긴 변은 2048px 까지 받아 4096px 로 키운다. 보이는 크기는 그대로이고 사진의 픽셀만 늘어난다."
nav: "tools"
tool: "photo_upscale"
generated: true
---

# 사진 편집기 — 2배 선명하게

`photo_upscale` · 매번 물어봄 · 내 컴퓨터

사진 요소를 가로세로 2배로 선명하게 키운다(초해상도). 브라우저 안에서 돌고 무료다. 처음 한 번 모델(8MB)을 받고, 큰 사진은 수십 초 걸릴 수 있다. 긴 변은 2048px 까지 받아 4096px 로 키운다. 보이는 크기는 그대로이고 사진의 픽셀만 늘어난다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `ref` | 문자열 | O | photo_canvas_get 이 준 사진 요소 ref |
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
