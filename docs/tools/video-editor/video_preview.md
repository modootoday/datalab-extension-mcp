---
layout: "dl-tool"
title: "영상 편집기 — 미리보기"
description: "영상의 한 프레임을 실제로 렌더한 작은 JPEG 이미지를 돌려준다. 장면·자막·요소가 의도대로 보이는지 확인할 때 쓴다."
nav: "tools"
tool: "video_preview"
generated: true
---

# 영상 편집기 — 미리보기

`video_preview` · 바로 조회 · 내 컴퓨터

영상의 한 프레임을 실제로 렌더한 작은 JPEG 이미지를 돌려준다. 장면·자막·요소가 의도대로 보이는지 확인할 때 쓴다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `scene` | 문자열 | X | 이 장면의 가운데 프레임을 본다 |
| `at_ms` | 정수 | X | 이 시각(ms)의 프레임을 본다. scene 이 있으면 무시 |
| `max_edge` | 정수 | X | 긴 변 픽셀. 생략 시 768 |
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
