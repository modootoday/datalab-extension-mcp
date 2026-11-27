---
layout: "dl-tool"
title: "영상 편집기 — 글자 넣기"
description: "장면 위에 글자를 얹는다. 자막과는 별개다 — 자막은 video_subtitle_set 으로 다루고, 이건 제목·강조 문구처럼 화면에 그려지는 일반 글자다. 여기의 align·글꼴·outline·shadow 는 이 글자에만 적용되고, 자막의 외곽선·그림자를 포함한 자막 서식은 video_subtitle_style_set 으로 바꾼다. outline·shadow 는 생략하면 preset 기본값을 쓴다(모든 preset 이 흰 글자에 #000000 4px 외곽선, 그림자 없음). 값이 범위를 벗어나면 아무것도 넣지 않고 거부한다. 넣은 값은 video_timeline_get 의 nodes[].style.outline·shadow 로 확인한다."
nav: "tools"
tool: "video_text_add"
generated: true
---

# 영상 편집기 — 글자 넣기

`video_text_add` · 매번 물어봄 · 내 컴퓨터

장면 위에 글자를 얹는다. 자막과는 별개다 — 자막은 video_subtitle_set 으로 다루고, 이건 제목·강조 문구처럼 화면에 그려지는 일반 글자다. 여기의 align·글꼴·outline·shadow 는 이 글자에만 적용되고, 자막의 외곽선·그림자를 포함한 자막 서식은 video_subtitle_style_set 으로 바꾼다. outline·shadow 는 생략하면 preset 기본값을 쓴다(모든 preset 이 흰 글자에 #000000 4px 외곽선, 그림자 없음). 값이 범위를 벗어나면 아무것도 넣지 않고 거부한다. 넣은 값은 video_timeline_get 의 nodes[].style.outline·shadow 로 확인한다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `scene` | 문자열 | O | video_timeline_get 이 준 장면 ref |
| `text` | 문자열 | O | 넣을 문구 |
| `preset` | 문자열 | X | 타이포 프리셋. 생략 시 heading |
| `fontFamily` | 문자열 | X | 글꼴. 생략 시 preset 기본값 |
| `fontSize` | 숫자 | X | 글자 크기(px). 생략 시 preset 기본값 |
| `fill` | 문자열 | X | 글자색 hex. 사진 위라 기본은 흰색+검정 외곽선이다 |
| `align` | 문자열 | X | 이 글자가 여러 줄일 때의 정렬(자막에는 영향 없음). 생략 시 preset 기본값 |
| `width` | 숫자 | X | 줄바꿈 폭(px) |
| `outline` | 객체 | X | 일반 글자의 외곽선. color 는 hex, width 는 px(0~20). null 이면 외곽선을 지운다. width 0 은 외곽선을 남겨 두되 그리지 않는다(읽으면 width 0 으로 보인다) |
| `shadow` | 객체 | X | 일반 글자의 그림자. color 는 hex, blur 는 흐림 px(0~100), offsetX·offsetY 는 옮기는 거리 px(-200~200). null 이면 그림자를 지운다 |
| `position` | 문자열 | X | 화면 안 위치(생략 시 가운데). x/y 보다 우선한다 |
| `x` | 숫자 | X | 왼쪽 위 x(px). position 이 있으면 무시 |
| `y` | 숫자 | X | 왼쪽 위 y(px). position 이 있으면 무시 |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — 자막 넣기](/tools/video-editor/video_subtitle_set/) `video_subtitle_set`
- [영상 편집기 — 자막 서식 바꾸기](/tools/video-timeline/video_subtitle_style_set/) `video_subtitle_style_set`
- [영상 편집기 — 타임라인 확인](/tools/video-editor/video_timeline_get/) `video_timeline_get`
- [영상 편집기 — 현재 프로젝트 확인](/tools/video-editor/video_project_get/) `video_project_get`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
