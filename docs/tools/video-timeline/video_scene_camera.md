---
layout: "dl-tool"
title: "영상 편집기 — 카메라 움직임 정하기"
description: "장면 사진 위에서 카메라가 start 화면에서 end 화면으로 장면 길이만큼 움직이게 한다(확대·위치를 직접 정하는 움직임). 프리셋 움직임을 대신한다. 영상이 있는 장면에는 적용되지 않는다."
nav: "tools"
tool: "video_scene_camera"
generated: true
---

# 영상 편집기 — 카메라 움직임 정하기

`video_scene_camera` · 매번 물어봄 · 내 컴퓨터

장면 사진 위에서 카메라가 start 화면에서 end 화면으로 장면 길이만큼 움직이게 한다(확대·위치를 직접 정하는 움직임). 프리셋 움직임을 대신한다. 영상이 있는 장면에는 적용되지 않는다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `scene` | 문자열 | O | video_timeline_get 이 준 장면 ref |
| `start` | 객체 | O | 시작 화면 |
| `end` | 객체 | O | 끝 화면 |
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
