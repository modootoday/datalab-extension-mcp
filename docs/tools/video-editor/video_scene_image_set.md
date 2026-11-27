---
layout: "dl-tool"
title: "영상 편집기 — 장면 사진 지정"
description: "장면의 배경 이미지를 이 영상에 이미 있는 다른 이미지로 바꾼다. video_sources_list 가 준 ref(m-…)만 쓸 수 있다 — 새 이미지를 만들거나 밖에서 가져오지는 못한다."
nav: "tools"
tool: "video_scene_image_set"
generated: true
---

# 영상 편집기 — 장면 사진 지정

`video_scene_image_set` · 매번 물어봄 · 내 컴퓨터

장면의 배경 이미지를 이 영상에 이미 있는 다른 이미지로 바꾼다. video_sources_list 가 준 ref(m-…)만 쓸 수 있다 — 새 이미지를 만들거나 밖에서 가져오지는 못한다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `scene` | 문자열 | O | video_timeline_get 이 준 장면 ref |
| `source` | 문자열 | O | video_sources_list 가 준 이미지 ref |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — 들어 있는 이미지 목록](/tools/video-editor/video_sources_list/) `video_sources_list`
- [영상 편집기 — 현재 프로젝트 확인](/tools/video-editor/video_project_get/) `video_project_get`
- [영상 편집기 — 새 프로젝트 만들기](/tools/video-editor/video_project_new/) `video_project_new`
- [영상 편집기 — 저장된 프로젝트 목록](/tools/video-editor/video_project_list/) `video_project_list`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
