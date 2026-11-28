---
layout: "dl-tool"
title: "영상 편집기 — 템플릿 목록"
description: "영상 템플릿 목록(id · 이름 · 용도 · 장면 수 · 길이 · 사진/영상 칸 수)을 본다. purpose 로 용도를 좁힌다."
nav: "tools"
tool: "video_template_list"
generated: true
---

# 영상 편집기 — 템플릿 목록

`video_template_list` · 바로 조회 · 내 컴퓨터

영상 템플릿 목록(id · 이름 · 용도 · 장면 수 · 길이 · 사진/영상 칸 수)을 본다. purpose 로 용도를 좁힌다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `purpose` | 문자열 | X | 용도(없으면 전체) |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — 현재 프로젝트 확인](/tools/video-editor/video_project_get/) `video_project_get`
- [영상 편집기 — 새 프로젝트 만들기](/tools/video-editor/video_project_new/) `video_project_new`
- [영상 편집기 — 저장된 프로젝트 목록](/tools/video-editor/video_project_list/) `video_project_list`
- [영상 편집기 — 저장된 프로젝트 열기](/tools/video-editor/video_project_open/) `video_project_open`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
