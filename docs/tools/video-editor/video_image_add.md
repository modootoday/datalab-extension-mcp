---
layout: "dl-tool"
title: "영상 편집기 — 사진 넣기"
description: "이 영상에 이미 있는 이미지를 장면 위에 얹는다(로고·워터마크 같은 오버레이). 장면의 배경 사진을 바꾸는 것은 video_scene_image_set 이고, 이건 그 위에 겹치는 별개 요소다. 크기를 안 주면 원본 비율을 지켜 화면의 일부 크기로 넣는다."
nav: "tools"
tool: "video_image_add"
generated: true
---

# 영상 편집기 — 사진 넣기

`video_image_add` · 매번 물어봄 · 내 컴퓨터

이 영상에 이미 있는 이미지를 장면 위에 얹는다(로고·워터마크 같은 오버레이). 장면의 배경 사진을 바꾸는 것은 video_scene_image_set 이고, 이건 그 위에 겹치는 별개 요소다. 크기를 안 주면 원본 비율을 지켜 화면의 일부 크기로 넣는다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `scene` | 문자열 | O | video_timeline_get 이 준 장면 ref |
| `source` | 문자열 | O | video_sources_list 가 준 이미지 ref |
| `width` | 숫자 | X | 폭(px). 생략 시 원본 비율로 자동. height 를 안 주면 비율로 계산 |
| `height` | 숫자 | X | 높이(px). 생략 시 원본 비율로 자동. width 를 안 주면 비율로 계산 |
| `position` | 문자열 | X | 화면 안 위치(생략 시 가운데). x/y 보다 우선한다 |
| `x` | 숫자 | X | 왼쪽 위 x(px). position 이 있으면 무시 |
| `y` | 숫자 | X | 왼쪽 위 y(px). position 이 있으면 무시 |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — 장면 사진 지정](/tools/video-editor/video_scene_image_set/) `video_scene_image_set`
- [영상 편집기 — 현재 프로젝트 확인](/tools/video-editor/video_project_get/) `video_project_get`
- [영상 편집기 — 새 프로젝트 만들기](/tools/video-editor/video_project_new/) `video_project_new`
- [영상 편집기 — 저장된 프로젝트 목록](/tools/video-editor/video_project_list/) `video_project_list`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
