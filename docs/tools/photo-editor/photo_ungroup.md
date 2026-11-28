---
layout: "dl-tool"
title: "사진 편집기 — 그룹 풀기"
description: "사진 편집기 캔버스에서 그룹을 푼다. 그룹 안 요소의 ref 를 주면 그 요소를 품은 가장 바깥 그룹이 풀린다. 요소의 위치와 모양은 그대로다."
nav: "tools"
tool: "photo_ungroup"
generated: true
---

# 사진 편집기 — 그룹 풀기

`photo_ungroup` · 매번 물어봄 · 내 컴퓨터

사진 편집기 캔버스에서 그룹을 푼다. 그룹 안 요소의 ref 를 주면 그 요소를 품은 가장 바깥 그룹이 풀린다. 요소의 위치와 모양은 그대로다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `ref` | 문자열 | O | 풀 그룹 ref(g-) 또는 그 안 요소 ref |
| `page` | 문자열 | X | 그룹이 있는 페이지 ref(예: 'p-c4d8'). 생략 시 활성 페이지 |
| `editor_session` | 문자열 | X | photo_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [사진 편집기 — 현재 프로젝트 확인](/tools/photo-editor/photo_project_get/) `photo_project_get`
- [사진 편집기 — 새 프로젝트 만들기](/tools/photo-editor/photo_project_new/) `photo_project_new`
- [사진 편집기 — 저장된 프로젝트 목록](/tools/photo-editor/photo_project_list/) `photo_project_list`
- [사진 편집기 — 저장된 프로젝트 열기](/tools/photo-editor/photo_project_open/) `photo_project_open`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
