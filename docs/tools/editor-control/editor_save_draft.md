---
layout: "dl-tool"
title: "임시저장"
description: "현재 글쓰기 창의 글을 네이버 임시저장에 저장하고, 네이버가 저장을 확인한 응답을 받은 뒤 답한다. 결과의 draftId 가 임시저장 목록의 글 번호이고 revision 은 저장한 시점의 문서다. kind 가 save-unconfirmed 면 저장을 확인하지 못한 것이니 '저장됐다'고 말하지 않는다(retryable 이 true 면 다시 시도). 제목과 본문이 모두 있어야 저장된다. 발행하지 않는다."
nav: "tools"
tool: "editor_save_draft"
generated: true
---

# 임시저장

`editor_save_draft` · 매번 물어봄 · 내 컴퓨터

현재 글쓰기 창의 글을 네이버 임시저장에 저장하고, 네이버가 저장을 확인한 응답을 받은 뒤 답한다. 결과의 draftId 가 임시저장 목록의 글 번호이고 revision 은 저장한 시점의 문서다. kind 가 save-unconfirmed 면 저장을 확인하지 못한 것이니 '저장됐다'고 말하지 않는다(retryable 이 true 면 다시 시도). 제목과 본문이 모두 있어야 저장된다. 발행하지 않는다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |

## 함께 쓰는 도구

- [내부 링크 제안](/tools/editor-control/internal_links/) `internal_links`
- [글쓰기 창 열기](/tools/editor-control/editor_open_window/) `editor_open_window`
- [편집기 창 정리 (하나만 남기고 닫기)](/tools/editor-control/editor_reduce_windows/) `editor_reduce_windows`
- [현재 글 읽기](/tools/editor-control/editor_read/) `editor_read`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
