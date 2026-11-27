---
layout: "dl-tool"
title: "이미지 삽입"
description: "사진 한 장을 현재 글쓰기 창 본문에 넣는다. 웹에 있는 사진은 url로, 이 컴퓨터에 있는 사진은 path(전체 경로)로 준다. 둘 중 하나만 준다. 본문에 사진을 넣어 달라는 요청에 사용한다. 넣을 때마다 사용자에게 확인을 받는다. 네이버 글쓰기 창이 열려 있어야 하고, path로 줄 때는 사용자 컴퓨터의 연결 프로그램이 연결되어 있어야 한다. 업로드가 끝난 뒤 답하며 결과의 componentId 가 새 사진이다. uploaded 가 false 면 업로드가 아직 진행 중이라 revision 이 곧 바뀌므로, 다음 쓰기 전에 editor_read_document 로 다시 읽는다."
nav: "tools"
tool: "editor_insert_image"
generated: true
---

# 이미지 삽입

`editor_insert_image` · 매번 물어봄 · 내 컴퓨터

사진 한 장을 현재 글쓰기 창 본문에 넣는다. 웹에 있는 사진은 url로, 이 컴퓨터에 있는 사진은 path(전체 경로)로 준다. 둘 중 하나만 준다. 본문에 사진을 넣어 달라는 요청에 사용한다. 넣을 때마다 사용자에게 확인을 받는다. 네이버 글쓰기 창이 열려 있어야 하고, path로 줄 때는 사용자 컴퓨터의 연결 프로그램이 연결되어 있어야 한다. 업로드가 끝난 뒤 답하며 결과의 componentId 가 새 사진이다. uploaded 가 false 면 업로드가 아직 진행 중이라 revision 이 곧 바뀌므로, 다음 쓰기 전에 editor_read_document 로 다시 읽는다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `url` | 문자열 | X | 웹에 있는 사진의 주소. 로그인 없이 바로 열리는 주소여야 한다 |
| `path` | 문자열 | X | 이 컴퓨터에 있는 사진의 전체 경로 (예: /Users/me/photo.jpg, D:\photos\cover.webp). 상대 경로는 받지 않는다. PNG·JPEG·GIF·WebP, 최대 10MB |
| `ai` | 참/거짓 | X | true 면 업로드가 끝난 뒤 그 사진에 'AI 활용' 표시를 켠다. 결과의 ai 가 실제 표시이고, 켜지 못했으면 aiMarkError 에 이유가 있다. |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [문서 전체 읽기](/tools/editor-control/editor_read_document/) `editor_read_document`
- [내부 링크 제안](/tools/editor-control/internal_links/) `internal_links`
- [글쓰기 창 열기](/tools/editor-control/editor_open_window/) `editor_open_window`
- [편집기 창 정리 (하나만 남기고 닫기)](/tools/editor-control/editor_reduce_windows/) `editor_reduce_windows`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
