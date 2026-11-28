---
layout: "dl-tool"
title: "영상 편집기 — 배경 바꾸기"
description: "장면의 배경색을 바꾼다(null=검정). 배경 이미지가 화면을 덮으면 보이지 않고, 이미지가 없는 장면에서만 드러난다. fit·box 로 놓은 배경 영상이 있는 장면에서는 영상이 덮지 않는 곳(contain 의 여백, box 바깥)의 색을 바꾸고 영상 자체 색은 그대로 두며, null 이면 문서 기본 배경색으로 돌아간다. 캔버스 전체를 덮는 배경 영상 장면에서는 아무것도 바뀌지 않고 hiddenBehindClip 을 돌려준다. 결과는 video_timeline_get 의 clipState.placement.background 로 확인한다."
nav: "tools"
tool: "video_background_set"
generated: true
---

# 영상 편집기 — 배경 바꾸기

`video_background_set` · 매번 물어봄 · 내 컴퓨터

장면의 배경색을 바꾼다(null=검정). 배경 이미지가 화면을 덮으면 보이지 않고, 이미지가 없는 장면에서만 드러난다. fit·box 로 놓은 배경 영상이 있는 장면에서는 영상이 덮지 않는 곳(contain 의 여백, box 바깥)의 색을 바꾸고 영상 자체 색은 그대로 두며, null 이면 문서 기본 배경색으로 돌아간다. 캔버스 전체를 덮는 배경 영상 장면에서는 아무것도 바뀌지 않고 hiddenBehindClip 을 돌려준다. 결과는 video_timeline_get 의 clipState.placement.background 로 확인한다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `scene` | 문자열 | O | video_timeline_get 이 준 장면 ref |
| `color` | 문자열 | O | 배경색 hex. null 이면 지운다 |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — 타임라인 확인](/tools/video-editor/video_timeline_get/) `video_timeline_get`
- [영상 편집기 — 현재 프로젝트 확인](/tools/video-editor/video_project_get/) `video_project_get`
- [영상 편집기 — 새 프로젝트 만들기](/tools/video-editor/video_project_new/) `video_project_new`
- [영상 편집기 — 저장된 프로젝트 목록](/tools/video-editor/video_project_list/) `video_project_list`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
