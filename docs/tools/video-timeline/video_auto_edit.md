---
layout: "dl-tool"
title: "영상 편집기 — 자동 편집"
description: "자동 편집을 돌린다(무료·로컬). 장면 나누기(shots)·조용한 구간 정리(silence)·말한 내용 자막으로(caption, 음성 인식 모델을 처음 한 번 받는다)·사진 자동 정렬(reframe)·색 자동 보정(grade) 중 고른 단계를 이 순서로 실행하고, 결정마다 이유를 기록해 하나씩 되돌릴 수 있다. stages 를 생략하면 caption 을 뺀 네 단계를 돌린다. 한 번 부른 결과는 style 까지 포함해 되돌리기 한 번으로 통째로 돌아가고, 문서가 바뀌지 않았으면 되돌리기 기록이 생기지 않는다(style 을 주면 응답(data)의 undoSteps 가 1 또는 0 이다)."
nav: "tools"
tool: "video_auto_edit"
generated: true
---

# 영상 편집기 — 자동 편집

`video_auto_edit` · 매번 물어봄 · 내 컴퓨터

자동 편집을 돌린다(무료·로컬). 장면 나누기(shots)·조용한 구간 정리(silence)·말한 내용 자막으로(caption, 음성 인식 모델을 처음 한 번 받는다)·사진 자동 정렬(reframe)·색 자동 보정(grade) 중 고른 단계를 이 순서로 실행하고, 결정마다 이유를 기록해 하나씩 되돌릴 수 있다. stages 를 생략하면 caption 을 뺀 네 단계를 돌린다. 한 번 부른 결과는 style 까지 포함해 되돌리기 한 번으로 통째로 돌아가고, 문서가 바뀌지 않았으면 되돌리기 기록이 생기지 않는다(style 을 주면 응답(data)의 undoSteps 가 1 또는 0 이다).

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `stages` | 목록 | X | 돌릴 단계. 생략하면 caption 을 뺀 전부 |
| `style` | 문자열 | X | 단계 뒤 입힐 스타일 팩(색·움직임·전환, 생략 시 없음): informative 정보형·차분, review 제품 또렷, vlog 필름·빠른 호흡, mood 감성·느리게, sale 세일·눈에 띄게, tutorial 화면 고정, news 뉴스·또박또박, minimal 흑백·장식 없음. 전환은 팩이 정한 몇 장면에만 든다 |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — 자막 서식 바꾸기](/tools/video-timeline/video_subtitle_style_set/) `video_subtitle_style_set`
- [영상 편집기 — 장면 자르기](/tools/video-timeline/video_scene_split/) `video_scene_split`
- [영상 편집기 — 음원 바꾸기](/tools/video-timeline/video_bgm_update/) `video_bgm_update`
- [영상 편집기 — 음원 자르기](/tools/video-timeline/video_bgm_split/) `video_bgm_split`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
