---
layout: "dl-tool"
title: "영상 편집기 — AI 목소리 만들기(요금)"
description: "자막을 AI 목소리로 만든다. 사용자에게 요금이 청구된다. 이미 최신 목소리가 있는 장면은 알아서 건너뛴다. scenes 를 주면 그 장면만, 생략하면 목소리가 필요한 장면 전부를 만든다."
nav: "tools"
tool: "video_narration_generate"
generated: true
---

# 영상 편집기 — AI 목소리 만들기(요금)

`video_narration_generate` · 매번 물어봄 · 내 컴퓨터

자막을 AI 목소리로 만든다. 사용자에게 요금이 청구된다. 이미 최신 목소리가 있는 장면은 알아서 건너뛴다. scenes 를 주면 그 장면만, 생략하면 목소리가 필요한 장면 전부를 만든다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `scenes` | 목록 | X | 대상 장면 ref 목록. 생략 시 목소리가 필요한 장면 전부 |
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
