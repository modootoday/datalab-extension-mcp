---
layout: "dl-tool"
title: "사진 편집기 — 지우기"
description: "사진 요소에서 고른 영역(사람 · 글자 · 물건)을 지우고 주변에 맞춰 채운다. 브라우저 안에서 돌고 무료다. 처음 한 번 모델(28MB)을 받는다. 영역은 사진 기준 비율(0~1)의 사각형 · 타원으로, 최대 8개. 보이는 크기와 자르기 · 색 보정은 그대로이고 사진의 픽셀만 바뀐다. photo_preview 로 위치를 먼저 확인하는 것이 좋다."
nav: "tools"
tool: "photo_inpaint"
generated: true
---

# 사진 편집기 — 지우기

`photo_inpaint` · 매번 물어봄 · 내 컴퓨터

사진 요소에서 고른 영역(사람 · 글자 · 물건)을 지우고 주변에 맞춰 채운다. 브라우저 안에서 돌고 무료다. 처음 한 번 모델(28MB)을 받는다. 영역은 사진 기준 비율(0~1)의 사각형 · 타원으로, 최대 8개. 보이는 크기와 자르기 · 색 보정은 그대로이고 사진의 픽셀만 바뀐다. photo_preview 로 위치를 먼저 확인하는 것이 좋다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `ref` | 문자열 | O | photo_canvas_get 이 준 사진 요소 ref |
| `regions` | 목록 | O | 지울 영역. x · y 는 사진 원본 왼쪽 위 기준 비율, w · h 는 사진 크기에 대한 비율(자르기 전 원본 기준) |
| `editor_session` | 문자열 | X | photo_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [사진 편집기 — 미리보기](/tools/photo-editor/photo_preview/) `photo_preview`
- [사진 편집기 — 현재 프로젝트 확인](/tools/photo-editor/photo_project_get/) `photo_project_get`
- [사진 편집기 — 새 프로젝트 만들기](/tools/photo-editor/photo_project_new/) `photo_project_new`
- [사진 편집기 — 저장된 프로젝트 목록](/tools/photo-editor/photo_project_list/) `photo_project_list`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
