---
layout: "dl-tool"
title: "임시저장 글 불러오기"
description: "임시저장한 글 하나를 지금 글쓰기 창에 불러온다. draftId 는 임시저장이나 임시저장 목록 도구가 돌려준 글 번호이고, 네이버 임시저장 목록에서 그 글을 누르는 방식이라 불러온 뒤 저장하면 같은 임시저장 글이 갱신된다. 지금 창에 마지막 저장 뒤 바뀐 내용이 있으면 불러오지 않고 kind 를 unsaved-changes 로 하고 멈추며, 그때는 editor_save_draft 로 먼저 저장하고 사용자가 그대로 넘어가도 된다고 했을 때만 discardUnsaved 를 true 로 준다. 불러온 뒤에는 revision 이 바뀌어 editor_read_document 로 다시 읽어야 쓸 수 있다. 불러오지 못한 open-unconfirmed 에서 revisionChanged 가 true 면 문서가 이미 바뀌었을 수 있어 retryable 이 false 이고, 다시 열기 전에 요청한 글인지 읽어 확인한다."
nav: "tools"
tool: "editor_open_saved_draft"
generated: true
---

# 임시저장 글 불러오기

`editor_open_saved_draft` · 매번 물어봄 · 내 컴퓨터

임시저장한 글 하나를 지금 글쓰기 창에 불러온다. draftId 는 임시저장이나 임시저장 목록 도구가 돌려준 글 번호이고, 네이버 임시저장 목록에서 그 글을 누르는 방식이라 불러온 뒤 저장하면 같은 임시저장 글이 갱신된다. 지금 창에 마지막 저장 뒤 바뀐 내용이 있으면 불러오지 않고 kind 를 unsaved-changes 로 하고 멈추며, 그때는 editor_save_draft 로 먼저 저장하고 사용자가 그대로 넘어가도 된다고 했을 때만 discardUnsaved 를 true 로 준다. 불러온 뒤에는 revision 이 바뀌어 editor_read_document 로 다시 읽어야 쓸 수 있다. 불러오지 못한 open-unconfirmed 에서 revisionChanged 가 true 면 문서가 이미 바뀌었을 수 있어 retryable 이 false 이고, 다시 열기 전에 요청한 글인지 읽어 확인한다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `draftId` | 문자열 | O | 불러올 임시저장 글 번호. |
| `discardUnsaved` | 참/거짓 | X | 저장하지 않은 변경이 있어도 불러온다. 네이버가 지금 원고를 먼저 임시저장한다. 사용자가 그래도 된다고 했을 때만 true. |

## 함께 쓰는 도구

- [임시저장](/tools/editor-control/editor_save_draft/) `editor_save_draft`
- [문서 전체 읽기](/tools/editor-control/editor_read_document/) `editor_read_document`
- [내부 링크 제안](/tools/editor-control/internal_links/) `internal_links`
- [글쓰기 창 열기](/tools/editor-control/editor_open_window/) `editor_open_window`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
