---
layout: "dl-tool"
title: "영상 편집기 — 요소 고치기"
description: "장면 안 요소의 속성을 바꾼다(이동·크기·회전·글자·색 등). patch 에 바꿀 필드만 넣는다. 요소 종류에 없는 필드는 거부되니 video_timeline_get 으로 종류를 먼저 확인한다. 한 번 호출이 되돌리기 한 단계다. 글자의 outline·shadow 는 화면에 얹은 일반 글자용이고, 자막의 외곽선·그림자는 video_subtitle_style_set 으로 바꾼다."
nav: "tools"
tool: "video_node_update"
generated: true
---

# 영상 편집기 — 요소 고치기

`video_node_update` · 매번 물어봄 · 내 컴퓨터

장면 안 요소의 속성을 바꾼다(이동·크기·회전·글자·색 등). patch 에 바꿀 필드만 넣는다. 요소 종류에 없는 필드는 거부되니 video_timeline_get 으로 종류를 먼저 확인한다. 한 번 호출이 되돌리기 한 단계다. 글자의 outline·shadow 는 화면에 얹은 일반 글자용이고, 자막의 외곽선·그림자는 video_subtitle_style_set 으로 바꾼다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `scene` | 문자열 | O | video_timeline_get 이 준 장면 ref |
| `node` | 문자열 | O | video_timeline_get 이 준 요소 ref(글자는 t-, 가림 영역은 r-, 이미지·도형은 i-) |
| `patch` | 객체 | O | 바꿀 필드만 담는다(부분 패치). 필드를 생략하면 그대로 두고, null 은 아래 필드에서만 지우기다. highlight·outline·shadow 는 null 이면 없앤다. grade 는 null 이면 색 보정 전체를 지우고, grade.lut 만 null 이면 LUT 만 빼고 나머지 보정은 남긴다(grade 를 주면서 lut 를 생략하면 올린 LUT 가 그대로 남는다). mask 는 null 이 아니라 mask.node 를 빈 문자열로 줘서 푼다. 그 밖의 필드에 null 을 주거나, 요소 종류(글자·이미지·도형·가림 영역)에 없는 필드나 범위를 벗어난 값을 주면 reason schema 로 거부하고 아무것도 바꾸지 않는다 |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — 타임라인 확인](/tools/video-editor/video_timeline_get/) `video_timeline_get`
- [영상 편집기 — 자막 서식 바꾸기](/tools/video-timeline/video_subtitle_style_set/) `video_subtitle_style_set`
- [영상 편집기 — 현재 프로젝트 확인](/tools/video-editor/video_project_get/) `video_project_get`
- [영상 편집기 — 새 프로젝트 만들기](/tools/video-editor/video_project_new/) `video_project_new`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
