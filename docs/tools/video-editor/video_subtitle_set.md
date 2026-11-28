---
layout: "dl-tool"
title: "영상 편집기 — 자막 넣기"
description: "한 장면의 자막을 바꾼다. 장면 script 의 source 가 subtitle 이면 자막이 곧 목소리 대본이고, narration 이면 대본이 따로 있어 자막을 고쳐도 대본과 이미 만든 목소리는 그대로다. 다만 가져온 목소리 파일이 지금 자막을 대본으로 따르고 있으면 대본도 같은 되돌리기 한 단계 안에서 새 자막으로 바뀌고 그 목소리는 stale 이 된다. 결과의 narrationStale 은 이번 호출로 최신이던 목소리가 stale 이 되었을 때만 true 이고, stale 인 목소리는 video_narration_generate 로 다시 만든다. 글꼴·크기·색 같은 서식만 바꾸려면 video_subtitle_style_set 을 쓰며, 그때 목소리는 stale 이 되지 않는다."
nav: "tools"
tool: "video_subtitle_set"
generated: true
---

# 영상 편집기 — 자막 넣기

`video_subtitle_set` · 매번 물어봄 · 내 컴퓨터

한 장면의 자막을 바꾼다. 장면 script 의 source 가 subtitle 이면 자막이 곧 목소리 대본이고, narration 이면 대본이 따로 있어 자막을 고쳐도 대본과 이미 만든 목소리는 그대로다. 다만 가져온 목소리 파일이 지금 자막을 대본으로 따르고 있으면 대본도 같은 되돌리기 한 단계 안에서 새 자막으로 바뀌고 그 목소리는 stale 이 된다. 결과의 narrationStale 은 이번 호출로 최신이던 목소리가 stale 이 되었을 때만 true 이고, stale 인 목소리는 video_narration_generate 로 다시 만든다. 글꼴·크기·색 같은 서식만 바꾸려면 video_subtitle_style_set 을 쓰며, 그때 목소리는 stale 이 되지 않는다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `scene` | 문자열 | O | video_timeline_get 이 준 장면 ref |
| `subtitle` | 문자열 | O | 새 자막. null 이면 자막을 지운다 |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — AI 목소리 만들기(요금)](/tools/video-editor/video_narration_generate/) `video_narration_generate`
- [영상 편집기 — 자막 서식 바꾸기](/tools/video-timeline/video_subtitle_style_set/) `video_subtitle_style_set`
- [영상 편집기 — 현재 프로젝트 확인](/tools/video-editor/video_project_get/) `video_project_get`
- [영상 편집기 — 새 프로젝트 만들기](/tools/video-editor/video_project_new/) `video_project_new`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
