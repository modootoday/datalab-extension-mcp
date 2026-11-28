---
layout: "dl-tool"
title: "사진 편집기 — 슬라이드쇼 시간"
description: "슬라이드쇼 시간을 정한다. page 를 주면 그 페이지만(머무는 시간·넘어가는 효과, null 이면 기본값으로), 없으면 문서 전체 기본값과 반복 여부를 바꾼다."
nav: "tools"
tool: "photo_slideshow_set"
generated: true
---

# 사진 편집기 — 슬라이드쇼 시간

`photo_slideshow_set` · 매번 물어봄 · 내 컴퓨터

슬라이드쇼 시간을 정한다. page 를 주면 그 페이지만(머무는 시간·넘어가는 효과, null 이면 기본값으로), 없으면 문서 전체 기본값과 반복 여부를 바꾼다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `hold_sec` | 숫자 | X | 페이지가 머무는 시간(초) |
| `transition` | 객체 | X | 다음 페이지로 넘어가는 효과 |
| `loop` | 참/거짓 | X | 끝나면 처음부터 반복(문서 전체) |
| `page` | 문자열 | X | 이 페이지만 바꿀 때의 페이지 ref |
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
