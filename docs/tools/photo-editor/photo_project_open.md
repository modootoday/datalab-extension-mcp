---
layout: "dl-tool"
title: "사진 편집기 — 저장된 프로젝트 열기"
description: "저장된 사진 프로젝트를 project_ref로 연다. 현재 프로젝트를 교체하므로 사용자 확인이 필요하다."
nav: "tools"
tool: "photo_project_open"
generated: true
---

# 사진 편집기 — 저장된 프로젝트 열기

`photo_project_open` · 매번 물어봄 · 내 컴퓨터

저장된 사진 프로젝트를 project_ref로 연다. 현재 프로젝트를 교체하므로 사용자 확인이 필요하다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `project_ref` | 문자열 | O | photo_project_list 가 준 프로젝트 ref |
| `editor_session` | 문자열 | X | photo_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [사진 편집기 — 현재 프로젝트 확인](/tools/photo-editor/photo_project_get/) `photo_project_get`
- [사진 편집기 — 새 프로젝트 만들기](/tools/photo-editor/photo_project_new/) `photo_project_new`
- [사진 편집기 — 저장된 프로젝트 목록](/tools/photo-editor/photo_project_list/) `photo_project_list`
- [사진 편집기 — 프로젝트 이름 바꾸기](/tools/photo-editor/photo_project_rename/) `photo_project_rename`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
