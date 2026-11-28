---
layout: "dl-tool"
title: "영상 편집기 — 화면 속 화면 넣기"
description: "영상에 쓰인 사진 하나를 화면 속 화면(작은 칸)으로 at_sec 부터 duration_sec 동안 얹는다. 장면과 따로 움직인다."
nav: "tools"
tool: "video_pip_add"
generated: true
---

# 영상 편집기 — 화면 속 화면 넣기

`video_pip_add` · 매번 물어봄 · 내 컴퓨터

영상에 쓰인 사진 하나를 화면 속 화면(작은 칸)으로 at_sec 부터 duration_sec 동안 얹는다. 장면과 따로 움직인다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `source` | 문자열 | O | video_sources_list 가 준 사진 ref |
| `at_sec` | 숫자 | O | 시작 위치(타임라인 초) |
| `duration_sec` | 숫자 | O | 보이는 시간(초) |
| `corner` | 문자열 | X | 칸의 자리. 생략하면 그대로(새로 넣을 때는 top-right) |
| `size` | 숫자 | X | 칸 너비(화면 너비 대비 0.1~0.9). 화면에서 정사각형이 된다 |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — 자막 서식 바꾸기](/tools/video-timeline/video_subtitle_style_set/) `video_subtitle_style_set`
- [영상 편집기 — 장면 자르기](/tools/video-timeline/video_scene_split/) `video_scene_split`
- [영상 편집기 — 음원 바꾸기](/tools/video-timeline/video_bgm_update/) `video_bgm_update`
- [영상 편집기 — 음원 자르기](/tools/video-timeline/video_bgm_split/) `video_bgm_split`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
