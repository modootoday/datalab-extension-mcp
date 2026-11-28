---
layout: "dl-tool"
title: "영상 편집기 — 영상 · 음악 파일 넣기"
description: "연결 프로그램에 올려 봉인한 영상·소리 파일(media_stage_commit 의 handle)을 영상 편집기에 넣는 job 을 시작해 돌려주고, 끝났는지는 video_job_status 로 확인한다. clip 은 10분까지 잘라 화질을 맞춘 뒤 그 장면의 배경 영상으로, bgm 은 배경 음악으로, narration 은 그 장면 대본을 읽은 목소리로 넣는다. narration 은 대본이 있는 장면만 되고, 장면 길이가 목소리에 맞춰 늘어나며, 대본을 고치면 다시 넣어야 한다. 되돌리기 한 번으로 돌아간다. clip 은 기본으로 캔버스 전체를 채워 가장자리가 잘리고, fit·box·anchor 중 하나라도 주면 box 안에 놓으며 영상이 덮지 않는 곳은 장면 배경색이 되고 video_background_set 으로 바꾼다. 배경 영상에는 장면 움직임이 적용되지 않고 전환은 적용된다."
nav: "tools"
tool: "video_source_add"
generated: true
---

# 영상 편집기 — 영상 · 음악 파일 넣기

`video_source_add` · 매번 물어봄 · 내 컴퓨터

연결 프로그램에 올려 봉인한 영상·소리 파일(media_stage_commit 의 handle)을 영상 편집기에 넣는 job 을 시작해 돌려주고, 끝났는지는 video_job_status 로 확인한다. clip 은 10분까지 잘라 화질을 맞춘 뒤 그 장면의 배경 영상으로, bgm 은 배경 음악으로, narration 은 그 장면 대본을 읽은 목소리로 넣는다. narration 은 대본이 있는 장면만 되고, 장면 길이가 목소리에 맞춰 늘어나며, 대본을 고치면 다시 넣어야 한다. 되돌리기 한 번으로 돌아간다. clip 은 기본으로 캔버스 전체를 채워 가장자리가 잘리고, fit·box·anchor 중 하나라도 주면 box 안에 놓으며 영상이 덮지 않는 곳은 장면 배경색이 되고 video_background_set 으로 바꾼다. 배경 영상에는 장면 움직임이 적용되지 않고 전환은 적용된다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `handle` | 문자열 | O | media_stage_commit 이 준 handle |
| `as` | 문자열 | O | clip=장면 배경 영상(영상 500MB 까지), bgm=배경 음악(60MB 까지), narration=장면 목소리(60MB 까지) |
| `scene` | 문자열 | X | clip·narration 을 넣을 장면 ref. clip 은 생략 시 활성 장면, narration 은 필수 |
| `range` | 객체 | X | clip 에서 쓸 구간(초). 10분을 넘으면 시작부터 10분. 생략 시 장면 길이만큼 |
| `quality` | 문자열 | X | clip 의 화질. 생략 시 balanced |
| `fit` | 문자열 | X | clip 을 box 에 맞추는 방식. contain=원본 전체가 보이게(빈 곳은 장면 배경색), cover=box 를 채우고 넘치는 쪽을 자름. fit·box·anchor 를 모두 생략하면 지금처럼 캔버스 전체 cover. box·anchor 만 주면 cover |
| `box` | 객체 | X | clip 을 놓을 영역(캔버스 px, 캔버스 안). 생략 시 캔버스 전체. 자막 위에 두려면 자막 영역보다 위로 잡는다 |
| `anchor` | 문자열 | X | box 안에서 붙을 쪽. contain 은 남는 공간에서의 위치, cover 는 잘린 뒤 남길 쪽. 생략 시 center |
| `start_ms` | 정수 | X | bgm 이 이미 있을 때 새 음악이 시작할 위치(ms). 생략 시 0 |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — 내보내기 진행 확인](/tools/video-editor/video_job_status/) `video_job_status`
- [영상 편집기 — 배경 바꾸기](/tools/video-editor/video_background_set/) `video_background_set`
- [영상 편집기 — 현재 프로젝트 확인](/tools/video-editor/video_project_get/) `video_project_get`
- [영상 편집기 — 새 프로젝트 만들기](/tools/video-editor/video_project_new/) `video_project_new`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
