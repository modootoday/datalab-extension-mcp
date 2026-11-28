---
layout: "dl-tool"
title: "영상 편집기 — 음원 바꾸기"
description: "음원 클립 하나의 음량·페이드·목소리 덕킹·시작 위치를 바꾼다. 넣은 항목만 바뀐다."
nav: "tools"
tool: "video_bgm_update"
generated: true
---

# 영상 편집기 — 음원 바꾸기

`video_bgm_update` · 매번 물어봄 · 내 컴퓨터

음원 클립 하나의 음량·페이드·목소리 덕킹·시작 위치를 바꾼다. 넣은 항목만 바뀐다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `music` | 문자열 | O | video_timeline_get 의 music[].ref |
| `volume` | 숫자 | X | 음량(0~1) |
| `fade_in_sec` | 숫자 | X | 처음에 서서히 커지는 시간(초). 0=없음 |
| `fade_out_sec` | 숫자 | X | 끝에 서서히 작아지는 시간(초). 0=없음 |
| `duck` | 참/거짓 | X | 목소리가 나오는 동안 음원을 낮출지 |
| `start_sec` | 숫자 | X | 타임라인에서 이 음원이 시작하는 위치(초) |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — 자막 서식 바꾸기](/tools/video-timeline/video_subtitle_style_set/) `video_subtitle_style_set`
- [영상 편집기 — 장면 자르기](/tools/video-timeline/video_scene_split/) `video_scene_split`
- [영상 편집기 — 음원 자르기](/tools/video-timeline/video_bgm_split/) `video_bgm_split`
- [영상 편집기 — 음원 빼기](/tools/video-timeline/video_bgm_remove/) `video_bgm_remove`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
