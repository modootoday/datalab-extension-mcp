---
layout: "dl-tool"
title: "영상 편집기 — 화면 비율 바꾸기(모든 장면 재배치)"
description: "영상 화면 크기를 바꾼다(예: 세로 1080x1920 → 가로 1920x1080). width·height 를 함께 주거나 preset 하나만 준다(둘 다 주면 거절한다). 모든 장면에 한꺼번에 적용된다 — 장면마다 크기가 다른 영상은 만들 수 없다. scale_content=true(기본)면 장면 안 요소도 함께 비율 조정된다. 결과 detail 에 preset(없으면 null)·width·height 를 준다."
nav: "tools"
tool: "video_canvas_resize"
generated: true
---

# 영상 편집기 — 화면 비율 바꾸기(모든 장면 재배치)

`video_canvas_resize` · 매번 물어봄 · 내 컴퓨터

영상 화면 크기를 바꾼다(예: 세로 1080x1920 → 가로 1920x1080). width·height 를 함께 주거나 preset 하나만 준다(둘 다 주면 거절한다). 모든 장면에 한꺼번에 적용된다 — 장면마다 크기가 다른 영상은 만들 수 없다. scale_content=true(기본)면 장면 안 요소도 함께 비율 조정된다. 결과 detail 에 preset(없으면 null)·width·height 를 준다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `preset` | 문자열 | X | 화면 크기 프리셋 id. 주면 width·height 는 생략한다. shorts(1080x1920) · square(1080x1080) · wide(1920x1080) · portrait(1080x1350) |
| `width` | 정수 | X | 새 화면 폭(px). 짝수여야 한다(인코더 제약). preset 이 없을 때 height 와 함께 |
| `height` | 정수 | X | 새 화면 높이(px). 짝수여야 한다(인코더 제약). preset 이 없을 때 width 와 함께 |
| `scale_content` | 참/거짓 | X | true(기본)면 장면 안 요소도 새 화면 비율에 맞춰 함께 커지거나 작아진다. false 면 요소의 크기·위치는 그대로라 화면 밖으로 벗어날 수 있다 |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — 현재 프로젝트 확인](/tools/video-editor/video_project_get/) `video_project_get`
- [영상 편집기 — 새 프로젝트 만들기](/tools/video-editor/video_project_new/) `video_project_new`
- [영상 편집기 — 저장된 프로젝트 목록](/tools/video-editor/video_project_list/) `video_project_list`
- [영상 편집기 — 저장된 프로젝트 열기](/tools/video-editor/video_project_open/) `video_project_open`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
