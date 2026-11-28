---
layout: "dl-tool"
title: "사진 편집기 — 게시물 가져오기"
description: "네이버 블로그·카페·인플루언서 게시물 주소를 읽어, 사진으로 카드 페이지를 마지막 페이지 뒤에 만들거나(mode='cards') 사진만 지금 페이지에 넣는다(mode='photos'). 사용자의 확장으로 읽으며 확장이 없으면 실패한다. 되돌리기 한 번으로 취소된다(cards)."
nav: "tools"
tool: "photo_post_import"
generated: true
---

# 사진 편집기 — 게시물 가져오기

`photo_post_import` · 매번 물어봄 · 내 컴퓨터

네이버 블로그·카페·인플루언서 게시물 주소를 읽어, 사진으로 카드 페이지를 마지막 페이지 뒤에 만들거나(mode='cards') 사진만 지금 페이지에 넣는다(mode='photos'). 사용자의 확장으로 읽으며 확장이 없으면 실패한다. 되돌리기 한 번으로 취소된다(cards).

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `url` | 문자열 | O | 게시물 주소 |
| `mode` | 문자열 | O | cards = 카드 페이지, photos = 사진만 지금 페이지에 |
| `count` | 문자열 | X | 카드 수(cards). 글이 많이 붙은 사진부터 고른다. 기본 5 |
| `text` | 문자열 | X | 카드 글(cards). 기본 line(한 줄) |
| `look` | 문자열 | X | 카드 모양(cards). 기본 photo-full |
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
