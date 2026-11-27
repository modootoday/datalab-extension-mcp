---
layout: "dl-tool"
title: "영상 편집기 — 타임라인 확인"
description: "현재 타임라인을 확인한다(장면 목록을 ref·길이·자막·목소리 상태와 함께). 편집 전 항상 먼저 호출해 장면 ref 를 파악한다. 장면 순서와 길이가 곧 타임라인이라 별도의 시간축은 없다. preset 은 화면 크기(width·height)와 크기가 같은 video_canvas_resize 프리셋 id 이고 없으면 null 이다. 장면마다 startMs 와, 전환이 있으면 transition(종류)·transitionMs(길이)와, 화면에 실제로 나가는 자막 조각 subtitleCues(startMs·endMs·text, 문서 시각)를 준다. 긴 자막은 여러 조각으로 나뉘어 나가므로 SRT 는 subtitle 이 아니라 subtitleCues 로 만든다. script 는 그 장면 목소리가 읽는 대본(text)과 출처(source: narration 이면 따로 쓴 대본, subtitle 이면 자막)다. measure: true 를 주면 글자 요소마다 measure(실제 줄바꿈·글꼴·영역·겹침)를, 자막 조각마다 wrappedLines·renderedBounds 를 렌더러 기준으로 함께 준다. 자막이나 장면 서식이 있는 장면은 subtitleStyle 에 전체 서식과 장면 덮어쓰기를 합친, 실제로 그려지는 자막 서식을 준다. renderer 는 이 타임라인을 그리는 렌더러·내보내기 버전이다. 배치를 정해 넣은 배경 영상은 clipState.placement 에 fit·anchor·box(캔버스 px)·crop(그려지는 원본 영역, 0..1)·renderedBounds(영상이 실제로 덮는 캔버스 px)를 렌더러와 같은 계산으로 준다. diagnostics: true 를 주면 장면마다 render 에 렌더러가 실제로 그리는 전환(transition: kind·실제 durationMs·문서 시각 startMs/endMs 창·아래 깔리는 previous 장면·layers 별 역할과 표본 시점 알파·이동·잘림, rendersAs 가 cut 이면 섞이지 않고 끊겨 보인다)과 움직임(motion: kind 와 elements 의 background·imageOverlays·text·subtitle 이 moves·still·absent 중 무엇인지)을 준다."
nav: "tools"
tool: "video_timeline_get"
generated: true
---

# 영상 편집기 — 타임라인 확인

`video_timeline_get` · 바로 조회 · 내 컴퓨터

현재 타임라인을 확인한다(장면 목록을 ref·길이·자막·목소리 상태와 함께). 편집 전 항상 먼저 호출해 장면 ref 를 파악한다. 장면 순서와 길이가 곧 타임라인이라 별도의 시간축은 없다. preset 은 화면 크기(width·height)와 크기가 같은 video_canvas_resize 프리셋 id 이고 없으면 null 이다. 장면마다 startMs 와, 전환이 있으면 transition(종류)·transitionMs(길이)와, 화면에 실제로 나가는 자막 조각 subtitleCues(startMs·endMs·text, 문서 시각)를 준다. 긴 자막은 여러 조각으로 나뉘어 나가므로 SRT 는 subtitle 이 아니라 subtitleCues 로 만든다. script 는 그 장면 목소리가 읽는 대본(text)과 출처(source: narration 이면 따로 쓴 대본, subtitle 이면 자막)다. measure: true 를 주면 글자 요소마다 measure(실제 줄바꿈·글꼴·영역·겹침)를, 자막 조각마다 wrappedLines·renderedBounds 를 렌더러 기준으로 함께 준다. 자막이나 장면 서식이 있는 장면은 subtitleStyle 에 전체 서식과 장면 덮어쓰기를 합친, 실제로 그려지는 자막 서식을 준다. renderer 는 이 타임라인을 그리는 렌더러·내보내기 버전이다. 배치를 정해 넣은 배경 영상은 clipState.placement 에 fit·anchor·box(캔버스 px)·crop(그려지는 원본 영역, 0..1)·renderedBounds(영상이 실제로 덮는 캔버스 px)를 렌더러와 같은 계산으로 준다. diagnostics: true 를 주면 장면마다 render 에 렌더러가 실제로 그리는 전환(transition: kind·실제 durationMs·문서 시각 startMs/endMs 창·아래 깔리는 previous 장면·layers 별 역할과 표본 시점 알파·이동·잘림, rendersAs 가 cut 이면 섞이지 않고 끊겨 보인다)과 움직임(motion: kind 와 elements 의 background·imageOverlays·text·subtitle 이 moves·still·absent 중 무엇인지)을 준다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `measure` | 참/거짓 | X | true 면 글자 배치를 렌더러로 잰 값을 붙인다. 글자 요소의 measure 에는 actualFont·fontsReady·fallbackGlyphs 가 있다. actualFont 는 캔버스가 실제로 그리는 글꼴로, 요청한 글꼴이 글자 일부라도 그리면 그 이름이고 하나도 못 그리면 대체 글꼴이다. fallbackGlyphs 는 요청한 글꼴에 없어 다른 글꼴로 그려지는 글자 목록(이모지·드문 한자 등, 빈 배열이면 모두 요청한 글꼴), null 이면 판별하지 못한 것이다. 글꼴 로딩을 기다려 느리므로 배치 확인이 필요할 때만 |
| `diagnostics` | 참/거짓 | X | true 면 장면마다 렌더러 기준 전환·움직임 진단(render)을 붙인다. 전환이 겹치는 구간이나 무엇이 움직이는지 확인할 때만 |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — 화면 비율 바꾸기(모든 장면 재배치)](/tools/video-editor/video_canvas_resize/) `video_canvas_resize`
- [영상 편집기 — 현재 프로젝트 확인](/tools/video-editor/video_project_get/) `video_project_get`
- [영상 편집기 — 새 프로젝트 만들기](/tools/video-editor/video_project_new/) `video_project_new`
- [영상 편집기 — 저장된 프로젝트 목록](/tools/video-editor/video_project_list/) `video_project_list`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
