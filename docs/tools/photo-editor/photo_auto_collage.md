---
layout: "dl-tool"
title: "사진 편집기 — 콜라주로 정리"
description: "페이지의 사진들을 콜라주로 정리한다. 줄 맞춘 칸에 사진을 채우고, 칸 모양에 맞게 가운데를 기준으로 잘라 여백이 없게 한다. refs 를 주면 그 사진만, 없으면 페이지의 모든 사진을 쓴다. 두 장 이상 필요하다."
nav: "tools"
tool: "photo_auto_collage"
generated: true
---

# 사진 편집기 — 콜라주로 정리

`photo_auto_collage` · 매번 물어봄 · 내 컴퓨터

페이지의 사진들을 콜라주로 정리한다. 줄 맞춘 칸에 사진을 채우고, 칸 모양에 맞게 가운데를 기준으로 잘라 여백이 없게 한다. refs 를 주면 그 사진만, 없으면 페이지의 모든 사진을 쓴다. 두 장 이상 필요하다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `refs` | 목록 | X | 정리할 사진 요소 ref 들(순서대로 배치) |
| `gap` | 숫자 | X | 칸 사이 간격, 페이지 너비 대비 비율(기본 0.02) |
| `editor_session` | 문자열 | X | photo_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [사진 편집기 — 현재 프로젝트 확인](/tools/photo-editor/photo_project_get/) `photo_project_get`
- [사진 편집기 — 새 프로젝트 만들기](/tools/photo-editor/photo_project_new/) `photo_project_new`
- [사진 편집기 — 저장된 프로젝트 목록](/tools/photo-editor/photo_project_list/) `photo_project_list`
- [사진 편집기 — 저장된 프로젝트 열기](/tools/photo-editor/photo_project_open/) `photo_project_open`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
