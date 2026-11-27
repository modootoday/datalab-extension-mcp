---
layout: "dl-tool"
title: "영상 편집기 — 자막 서식 바꾸기"
description: "자막 서식(글꼴·크기·굵기·색·외곽선·배경 상자·아래 여백)을 바꾼다. scene 을 생략하면 영상 전체 자막 서식을, 주면 그 장면만의 서식(덮어쓰기)을 고치고 clear=true 면 그 장면을 다시 전체 서식으로 되돌린다. 자막은 언제나 가로 가운데 정렬이라 정렬 값은 없다 — video_text_add 의 align 은 화면 위 글자용이고 자막에는 쓰지 않는다. 한 번 호출이 되돌리기 한 단계이고, 적용된 서식은 video_timeline_get 의 장면 subtitleStyle 로 확인한다.\npreset 으로 이름 붙은 서식을 한 번에 입힌다. 프리셋을 먼저 펼치고 같은 호출의 style 항목이 그 위를 덮는다. 글꼴은 모두 번들 글꼴 목록 안에서 고른 것이다.\n- clean: 흰 글자·검은 외곽선(기본 서식)\n- bold-outline: 굵은 디스플레이체·두꺼운 검은 외곽선\n- box: 외곽선 없이 반투명 검은 상자\n- highlight-yellow: 노란 글자·어두운 외곽선\n- minimal-shadow: 외곽선 없이 그림자만\n- myeongjo-vlog: 명조체·작은 크기·옅은 그림자\n- variety-emphasis: 넓적한 디스플레이체·분홍 외곽선"
nav: "tools"
tool: "video_subtitle_style_set"
generated: true
---

# 영상 편집기 — 자막 서식 바꾸기

`video_subtitle_style_set` · 매번 물어봄 · 내 컴퓨터

자막 서식(글꼴·크기·굵기·색·외곽선·배경 상자·아래 여백)을 바꾼다. scene 을 생략하면 영상 전체 자막 서식을, 주면 그 장면만의 서식(덮어쓰기)을 고치고 clear=true 면 그 장면을 다시 전체 서식으로 되돌린다. 자막은 언제나 가로 가운데 정렬이라 정렬 값은 없다 — video_text_add 의 align 은 화면 위 글자용이고 자막에는 쓰지 않는다. 한 번 호출이 되돌리기 한 단계이고, 적용된 서식은 video_timeline_get 의 장면 subtitleStyle 로 확인한다.
preset 으로 이름 붙은 서식을 한 번에 입힌다. 프리셋을 먼저 펼치고 같은 호출의 style 항목이 그 위를 덮는다. 글꼴은 모두 번들 글꼴 목록 안에서 고른 것이다.
- clean: 흰 글자·검은 외곽선(기본 서식)
- bold-outline: 굵은 디스플레이체·두꺼운 검은 외곽선
- box: 외곽선 없이 반투명 검은 상자
- highlight-yellow: 노란 글자·어두운 외곽선
- minimal-shadow: 외곽선 없이 그림자만
- myeongjo-vlog: 명조체·작은 크기·옅은 그림자
- variety-emphasis: 넓적한 디스플레이체·분홍 외곽선

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `preset` | 문자열 | X | 입힐 자막 서식 프리셋. style 을 함께 주면 그 항목이 프리셋을 덮는다 |
| `scene` | 문자열 | X | video_timeline_get 이 준 장면 ref. 생략하면 영상 전체 자막 서식 |
| `clear` | 참/거짓 | X | scene 과 함께 true 면 그 장면의 덮어쓰기를 지워 전체 서식을 따르게 한다. style 과 같이 줄 수 없다 |
| `style` | 객체 | X | 바꿀 항목만. null 인 항목은 지운다(장면에서는 전체 서식을 다시 따른다) |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — 글자 넣기](/tools/video-editor/video_text_add/) `video_text_add`
- [영상 편집기 — 타임라인 확인](/tools/video-editor/video_timeline_get/) `video_timeline_get`
- [영상 편집기 — 장면 자르기](/tools/video-timeline/video_scene_split/) `video_scene_split`
- [영상 편집기 — 음원 바꾸기](/tools/video-timeline/video_bgm_update/) `video_bgm_update`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
