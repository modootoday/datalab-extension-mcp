---
layout: "dl-tool"
title: "영상 편집기 — 화면 속 화면 바꾸기"
description: "화면 속 화면 하나의 자리·크기·시작·길이·색 보정을 바꾼다. 넣은 항목만 바뀐다. 초록·파랑 배경 앞에서 찍은 칸은 grade.key 로 배경을 투명하게 만든다. 걸린 보정은 video_timeline_get 의 pips[].grade 로 읽는다(보정이 없으면 null)."
nav: "tools"
tool: "video_pip_update"
generated: true
---

# 영상 편집기 — 화면 속 화면 바꾸기

`video_pip_update` · 매번 물어봄 · 내 컴퓨터

화면 속 화면 하나의 자리·크기·시작·길이·색 보정을 바꾼다. 넣은 항목만 바뀐다. 초록·파랑 배경 앞에서 찍은 칸은 grade.key 로 배경을 투명하게 만든다. 걸린 보정은 video_timeline_get 의 pips[].grade 로 읽는다(보정이 없으면 null).

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `pip` | 문자열 | O | video_timeline_get 의 pips[].ref |
| `corner` | 문자열 | X | 칸의 자리. 생략하면 그대로(새로 넣을 때는 top-right) |
| `size` | 숫자 | X | 칸 너비(화면 너비 대비 0.1~0.9). 화면에서 정사각형이 된다 |
| `start_sec` | 숫자 | X | 타임라인에서 칸이 나타나는 위치(초) |
| `duration_sec` | 숫자 | X | 칸이 보이는 시간(초) |
| `grade` | 객체 | X | 레벨·커브(x 순서의 점 2~6개)·색 띠별 HSL·크로마키(key)·LUT. 이 객체가 기존 값을 대신하지만 lut 를 빼면 올린 LUT 는 남고, lut 가 null 이면 LUT 만 뺀다. lut 의 handle 은 media_stage 로 올린 .cube 파일이다. null 이면 전부 해제 |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — 타임라인 확인](/tools/video-editor/video_timeline_get/) `video_timeline_get`
- [영상 편집기 — 자막 서식 바꾸기](/tools/video-timeline/video_subtitle_style_set/) `video_subtitle_style_set`
- [영상 편집기 — 장면 자르기](/tools/video-timeline/video_scene_split/) `video_scene_split`
- [영상 편집기 — 음원 바꾸기](/tools/video-timeline/video_bgm_update/) `video_bgm_update`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
