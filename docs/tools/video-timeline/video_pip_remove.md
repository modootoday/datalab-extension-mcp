---
layout: "dl-tool"
title: "영상 편집기 — 화면 속 화면 빼기"
description: "화면 속 화면 하나를 뺀다."
nav: "tools"
tool: "video_pip_remove"
generated: true
---

# 영상 편집기 — 화면 속 화면 빼기

`video_pip_remove` · 매번 물어봄 · 내 컴퓨터

화면 속 화면 하나를 뺀다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `pip` | 문자열 | O | video_timeline_get 의 pips[].ref |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — 자막 서식 바꾸기](/tools/video-timeline/video_subtitle_style_set/) `video_subtitle_style_set`
- [영상 편집기 — 장면 자르기](/tools/video-timeline/video_scene_split/) `video_scene_split`
- [영상 편집기 — 음원 바꾸기](/tools/video-timeline/video_bgm_update/) `video_bgm_update`
- [영상 편집기 — 음원 자르기](/tools/video-timeline/video_bgm_split/) `video_bgm_split`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
