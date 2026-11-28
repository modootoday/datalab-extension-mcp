---
layout: "dl-tool"
title: "사진 편집기 — 템플릿 목록"
description: "템플릿 목록(id · 이름 · 용도 · 크기)을 본다. purpose 로 용도를 좁힌다. id 를 photo_template_apply 에 쓴다."
nav: "tools"
tool: "photo_template_list"
generated: true
---

# 사진 편집기 — 템플릿 목록

`photo_template_list` · 바로 조회 · 내 컴퓨터

템플릿 목록(id · 이름 · 용도 · 크기)을 본다. purpose 로 용도를 좁힌다. id 를 photo_template_apply 에 쓴다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `purpose` | 문자열 | X | 용도(없으면 전체) |
| `editor_session` | 문자열 | X | photo_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [사진 편집기 — 템플릿 적용(기존 내용 대체)](/tools/photo-editor/photo_template_apply/) `photo_template_apply`
- [사진 편집기 — 현재 프로젝트 확인](/tools/photo-editor/photo_project_get/) `photo_project_get`
- [사진 편집기 — 새 프로젝트 만들기](/tools/photo-editor/photo_project_new/) `photo_project_new`
- [사진 편집기 — 저장된 프로젝트 목록](/tools/photo-editor/photo_project_list/) `photo_project_list`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
