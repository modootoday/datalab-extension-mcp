---
layout: "dl-tool"
title: "영상 편집기 — 장면 고치기"
description: "한 장면의 길이·전환·모션·색을 바꾼다. 이 도구의 색은 배경 사진의 filter·adjust·grade 와 배경 영상의 grade 이고, 위에 얹은 이미지면 video_node_update, 화면 속 화면이면 video_pip_update 를 쓴다. 장면은 배경 사진과 배경 영상 중 하나만 보여 주므로 배경 영상이 있는 장면에서 filter·adjust·target photo 는 거부되고, contain 으로 놓은 영상의 여백 색은 어떤 보정도 받지 않는다. 길이를 고정(durationLocked)하면 목소리를 만들 때 자동으로 늘어나지 않는다. 한 번 호출이 되돌리기 한 단계이고, 값이 하나라도 잘못되면 아무것도 바꾸지 않고 거부한다."
nav: "tools"
tool: "video_scene_update"
generated: true
---

# 영상 편집기 — 장면 고치기

`video_scene_update` · 매번 물어봄 · 내 컴퓨터

한 장면의 길이·전환·모션·색을 바꾼다. 이 도구의 색은 배경 사진의 filter·adjust·grade 와 배경 영상의 grade 이고, 위에 얹은 이미지면 video_node_update, 화면 속 화면이면 video_pip_update 를 쓴다. 장면은 배경 사진과 배경 영상 중 하나만 보여 주므로 배경 영상이 있는 장면에서 filter·adjust·target photo 는 거부되고, contain 으로 놓은 영상의 여백 색은 어떤 보정도 받지 않는다. 길이를 고정(durationLocked)하면 목소리를 만들 때 자동으로 늘어나지 않는다. 한 번 호출이 되돌리기 한 단계이고, 값이 하나라도 잘못되면 아무것도 바꾸지 않고 거부한다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `scene` | 문자열 | O | video_timeline_get 이 준 장면 ref |
| `durationMs` | 정수 | X | 장면 길이(ms). 재생 순서상 이 장면이 화면에 머무는 시간을 정한다 |
| `durationLocked` | 참/거짓 | X | true 면 길이를 고정해, 이 장면에 목소리를 새로 만들어도 길이가 그 목소리 길이에 맞춰 자동으로 늘어나지 않는다 |
| `transition` | 문자열 | X | 앞 장면에서 넘어올 때의 전환. null 이면 없앤다 |
| `transition_ms` | 정수 | X | 전환 길이(ms, 200~2000, 생략하면 500)로, 컷·스와이프 200~500ms, 마스크·줌 500~1000ms 가 알맞다. transition 이 null·none 이면 무시하고, transition 없이 주면 이미 있는 전환의 길이만 바꾼다 |
| `motion` | 문자열 | X | 장면 안에서의 카메라 움직임. null 이면 없앤다 |
| `speed` | 숫자 | X | 장면 영상의 재생 속도(0.25~4배). 길이를 고정하지 않았으면 장면 길이가 영상에 맞춰진다. null 이면 1배. 영상이 없는 장면에서는 거부된다 |
| `grade` | 객체 | X | 레벨·커브(x 순서의 점 2~6개)·색 띠별 HSL·크로마키(key)·LUT. 이 객체가 기존 값을 대신하지만 lut 를 빼면 올린 LUT 는 남고, lut 가 null 이면 LUT 만 뺀다. lut 의 handle 은 media_stage 로 올린 .cube 파일이다. null 이면 전부 해제 |
| `target` | 문자열 | X | grade 를 걸 곳. auto(기본)는 배경 영상이 있으면 영상, 없으면 배경 사진. clip·photo 는 그것이 없는 장면에서 거부된다. grade 없이 주면 거부된다 |
| `filter` | 문자열 | X | 배경 사진의 필터 프리셋. null 이면 지운다. 배경 사진이 없는 장면에서는 거부된다. 이미지 필터 프리셋. food-* 는 음식(신선·달콤·바삭·그릴), product-white 는 밝기로 밝은 배경을 맑은 흰색으로 보이게 하는 룩(배경 제거가 아니다), film-warm·film-cool 은 들뜬 검정과 옅은 그레인의 필름 룩 |
| `adjust` | 객체 | X | 배경 사진 보정(brightness·contrast·saturation·temperature·tint, 각 -1~1, 0 이 그대로). 이 객체가 기존 보정을 대신하고 넣지 않은 항목은 0 이다. 필터 위에 더해진다. null 이면 보정을 지운다. 배경 사진이 없는 장면에서는 거부된다 |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — 요소 고치기](/tools/video-editor/video_node_update/) `video_node_update`
- [영상 편집기 — 화면 속 화면 바꾸기](/tools/video-timeline/video_pip_update/) `video_pip_update`
- [영상 편집기 — 현재 프로젝트 확인](/tools/video-editor/video_project_get/) `video_project_get`
- [영상 편집기 — 새 프로젝트 만들기](/tools/video-editor/video_project_new/) `video_project_new`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
