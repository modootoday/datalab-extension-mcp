---
layout: "dl-tool"
title: "사진 편집기 — 템플릿 적용(기존 내용 대체)"
description: "템플릿을 적용한다. mode 가 replace 면 현재 페이지의 기존 요소를 모두 지우고 바꿔 되돌릴 수 없고, new_page 면 새 페이지를 더해 기존 내용을 남긴다. 실행 전에 사용자 확인을 받는다."
nav: "tools"
tool: "photo_template_apply"
generated: true
---

# 사진 편집기 — 템플릿 적용(기존 내용 대체)

`photo_template_apply` · 매번 물어봄 · 내 컴퓨터

템플릿을 적용한다. mode 가 replace 면 현재 페이지의 기존 요소를 모두 지우고 바꿔 되돌릴 수 없고, new_page 면 새 페이지를 더해 기존 내용을 남긴다. 실행 전에 사용자 확인을 받는다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `template` | 문자열 | O | 적용할 템플릿 id. 앞머리 sq 는 정방형, story 는 스토리, yt 는 유튜브 썸네일, blog 는 블로그 크기다. 이름과 용도는 photo_template_list 가 준다 |
| `mode` | 문자열 | O | 'replace' 는 현재 페이지의 기존 요소를 모두 지우고 템플릿으로 교체한다(되돌릴 수 없음). 'new_page' 는 새 페이지를 추가해 템플릿을 채운다(기존 내용 보존) |
| `editor_session` | 문자열 | X | photo_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [사진 편집기 — 현재 프로젝트 확인](/tools/photo-editor/photo_project_get/) `photo_project_get`
- [사진 편집기 — 새 프로젝트 만들기](/tools/photo-editor/photo_project_new/) `photo_project_new`
- [사진 편집기 — 저장된 프로젝트 목록](/tools/photo-editor/photo_project_list/) `photo_project_list`
- [사진 편집기 — 저장된 프로젝트 열기](/tools/photo-editor/photo_project_open/) `photo_project_open`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
