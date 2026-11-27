---
layout: "dl-tool"
title: "사진 편집기 — 캔버스 크기 바꾸기"
description: "캔버스 크기를 바꾼다. width·height 를 함께 주거나 preset 하나만 준다(둘 다 주면 거절한다). scale_content=true(기본)면 요소도 함께 비율 조정(매직 리사이즈). 결과 detail 에 preset(없으면 null)·width·height 를 준다."
nav: "tools"
tool: "photo_canvas_resize"
generated: true
---

# 사진 편집기 — 캔버스 크기 바꾸기

`photo_canvas_resize` · 매번 물어봄 · 내 컴퓨터

캔버스 크기를 바꾼다. width·height 를 함께 주거나 preset 하나만 준다(둘 다 주면 거절한다). scale_content=true(기본)면 요소도 함께 비율 조정(매직 리사이즈). 결과 detail 에 preset(없으면 null)·width·height 를 준다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `preset` | 문자열 | X | 크기 프리셋 id. 주면 width·height 는 생략한다. blog-cover(1200x630) · blog-body(900x600) · naver-thumbnail(1200x675) · instagram-square(1080x1080) · instagram-portrait(1080x1350) · instagram-tall(1080x1440) · instagram-story(1080x1920) · youtube-thumbnail(1280x720) · smartstore-square(1000x1000) · smartstore-detail(860x1200) · promo-banner(1080x400) |
| `width` | 정수 | X | 캔버스 가로 크기(px). preset 이 없을 때 height 와 함께 |
| `height` | 정수 | X | 캔버스 세로 크기(px). preset 이 없을 때 width 와 함께 |
| `scale_content` | 참/거짓 | X | true(기본)면 기존 요소도 새 캔버스 비율에 맞춰 위치·크기를 함께 조정(매직 리사이즈), false 면 요소는 원래 px 그대로 두어 잘리거나 여백이 생길 수 있다 |
| `all_pages` | 참/거짓 | X | 모든 페이지에 적용 |
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
