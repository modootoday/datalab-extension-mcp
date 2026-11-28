---
layout: "dl-tool"
title: "사진 편집기 — 내보내기 진행 확인"
description: "photo_export 가 시작한 job 의 진행 상태와, 끝났으면 결과 파일 이름·크기·sha256 을 확인한다. 글자가 있는 내보내기면 fonts(status ready·fallback·timeout 과 글꼴별 drawn·actualFont·fallbackGlyphs)도 함께 준다."
nav: "tools"
tool: "photo_job_status"
generated: true
---

# 사진 편집기 — 내보내기 진행 확인

`photo_job_status` · 바로 조회 · 내 컴퓨터

photo_export 가 시작한 job 의 진행 상태와, 끝났으면 결과 파일 이름·크기·sha256 을 확인한다. 글자가 있는 내보내기면 fonts(status ready·fallback·timeout 과 글꼴별 drawn·actualFont·fallbackGlyphs)도 함께 준다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `job` | 문자열 | O | photo_export 가 준 job |
| `editor_session` | 문자열 | X | photo_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [사진 편집기 — 파일로 내보내기](/tools/photo-editor/photo_export/) `photo_export`
- [사진 편집기 — 현재 프로젝트 확인](/tools/photo-editor/photo_project_get/) `photo_project_get`
- [사진 편집기 — 새 프로젝트 만들기](/tools/photo-editor/photo_project_new/) `photo_project_new`
- [사진 편집기 — 저장된 프로젝트 목록](/tools/photo-editor/photo_project_list/) `photo_project_list`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
