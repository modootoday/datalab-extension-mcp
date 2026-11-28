---
layout: "dl-tool"
title: "영상 편집기 — 타임라인 확인"
description: "현재 타임라인을 장면 목록(ref·길이·자막·목소리 상태)으로 확인하며, 편집 전에 먼저 불러 장면 ref 를 알아 둔다. 장면 순서와 길이가 곧 타임라인이라 별도의 시간축은 없고, 아무것도 바꾸지 않는다. 긴 자막은 여러 조각으로 나뉘어 나가므로 SRT 는 subtitle 이 아니라 subtitleCues 로 만든다. script 의 source 가 narration 이면 자막과 따로 쓴 대본이고 subtitle 이면 자막이 곧 대본이다. diagnostics 를 주면 붙는 render 에서 전환의 rendersAs 가 cut 이면 섞이지 않고 끊겨 보인다."
nav: "tools"
tool: "video_timeline_get"
generated: true
---

# 영상 편집기 — 타임라인 확인

`video_timeline_get` · 바로 조회 · 내 컴퓨터

현재 타임라인을 장면 목록(ref·길이·자막·목소리 상태)으로 확인하며, 편집 전에 먼저 불러 장면 ref 를 알아 둔다. 장면 순서와 길이가 곧 타임라인이라 별도의 시간축은 없고, 아무것도 바꾸지 않는다. 긴 자막은 여러 조각으로 나뉘어 나가므로 SRT 는 subtitle 이 아니라 subtitleCues 로 만든다. script 의 source 가 narration 이면 자막과 따로 쓴 대본이고 subtitle 이면 자막이 곧 대본이다. diagnostics 를 주면 붙는 render 에서 전환의 rendersAs 가 cut 이면 섞이지 않고 끊겨 보인다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `measure` | 참/거짓 | X | true 면 글자 요소와 자막 조각마다 렌더러가 잰 줄바꿈·실제 글꼴·영역·겹침을 붙인다. fallbackGlyphs 는 다른 글꼴로 그려지는 글자이고 null 이면 판별하지 못한 것이다. 글꼴 로딩을 기다려 느리다 |
| `diagnostics` | 참/거짓 | X | true 면 장면마다 렌더러 기준 전환·움직임 진단(render)을 붙인다. 전환이 겹치는 구간이나 무엇이 움직이는지 확인할 때만 |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — 현재 프로젝트 확인](/tools/video-editor/video_project_get/) `video_project_get`
- [영상 편집기 — 새 프로젝트 만들기](/tools/video-editor/video_project_new/) `video_project_new`
- [영상 편집기 — 저장된 프로젝트 목록](/tools/video-editor/video_project_list/) `video_project_list`
- [영상 편집기 — 저장된 프로젝트 열기](/tools/video-editor/video_project_open/) `video_project_open`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
