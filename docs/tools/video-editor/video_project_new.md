---
layout: "dl-tool"
title: "영상 편집기 — 새 프로젝트 만들기"
description: "첫 장면이 있는 빈 영상 프로젝트를 만들고 즉시 저장한다. 시작 화면에서도 실행할 수 있으며 현재 프로젝트를 교체하므로 사용자 확인이 필요하다."
nav: "tools"
tool: "video_project_new"
generated: true
---

# 영상 편집기 — 새 프로젝트 만들기

`video_project_new` · 매번 물어봄 · 내 컴퓨터

첫 장면이 있는 빈 영상 프로젝트를 만들고 즉시 저장한다. 시작 화면에서도 실행할 수 있으며 현재 프로젝트를 교체하므로 사용자 확인이 필요하다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `width` | 정수 | X | 영상 가로 크기(px). 생략 시 1080 |
| `height` | 정수 | X | 영상 세로 크기(px). 생략 시 1920 |
| `fps` | 정수 | X | 초당 프레임 수. 생략 시 30. 60 은 움직임이 부드럽지만 내보내기가 두 배 걸린다 |
| `name` | 문자열 | X | 새 프로젝트 이름. 생략 시 자동 이름 |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — 현재 프로젝트 확인](/tools/video-editor/video_project_get/) `video_project_get`
- [영상 편집기 — 저장된 프로젝트 목록](/tools/video-editor/video_project_list/) `video_project_list`
- [영상 편집기 — 저장된 프로젝트 열기](/tools/video-editor/video_project_open/) `video_project_open`
- [영상 편집기 — 프로젝트 이름 바꾸기](/tools/video-editor/video_project_rename/) `video_project_rename`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
