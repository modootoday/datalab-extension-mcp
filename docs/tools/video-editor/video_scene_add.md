---
layout: "dl-tool"
title: "영상 편집기 — 장면 추가"
description: "새 장면을 추가한다. index 를 주면 그 위치에 끼워 넣고, 생략하면 맨 뒤에 붙인다. 뒤 장면들은 자동으로 밀린다."
nav: "tools"
tool: "video_scene_add"
generated: true
---

# 영상 편집기 — 장면 추가

`video_scene_add` · 매번 물어봄 · 내 컴퓨터

새 장면을 추가한다. index 를 주면 그 위치에 끼워 넣고, 생략하면 맨 뒤에 붙인다. 뒤 장면들은 자동으로 밀린다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `index` | 정수 | X | 끼워 넣을 위치(0-기반). 생략 시 맨 뒤 |
| `subtitle` | 문자열 | X | 이 장면의 자막 |
| `durationMs` | 정수 | X | 장면 길이(ms). 생략 시 자막 길이로 추정 |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — 현재 프로젝트 확인](/tools/video-editor/video_project_get/) `video_project_get`
- [영상 편집기 — 새 프로젝트 만들기](/tools/video-editor/video_project_new/) `video_project_new`
- [영상 편집기 — 저장된 프로젝트 목록](/tools/video-editor/video_project_list/) `video_project_list`
- [영상 편집기 — 저장된 프로젝트 열기](/tools/video-editor/video_project_open/) `video_project_open`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
