---
layout: "dl-tool"
title: "임시저장 글 불러오기"
description: "임시저장한 글 하나를 지금 글쓰기 창에 불러온다. draftId 는 editor_save_draft 나 editor_list_saved_drafts 가 돌려준 글 번호다. 네이버 임시저장 목록에서 그 글을 누르는 방식이라, 불러온 뒤 저장하면 같은 임시저장 글이 갱신된다. 지금 창에 마지막 저장 뒤 바뀐 내용이 있으면 불러오지 않고 kind: unsaved-changes 로 멈춘다 — 먼저 editor_save_draft 로 저장하거나, 사용자가 그대로 넘어가도 된다고 했을 때만 discardUnsaved: true. true 이면 네이버가 지금 원고를 먼저 임시저장한 뒤 불러온다. 불러온 뒤 revision 이 바뀌므로 editor_read_document 로 다시 읽고 쓴다. unsaved-changes 의 lastSave 는 이 글쓰기 페이지가 마지막으로 확인한 저장(네이버 자동저장 포함)이라 불러오려는 글 번호와 다를 수 있고, revision 이 null 이면 이 도구가 저장한 것이 아니다. 불러오지 못했을 때(open-unconfirmed)는 trace 로 상황을 알린다: pressed(글을 눌렀는지), readObserved(네이버가 그 글을 읽었는지), revisionBefore·revisionNow·revisionChanged. revisionChanged 가 true 이면 편집기 문서가 이미 바뀌었을 수 있어 retryable 이 false 이며, 다시 열기 전에 editor_read_document 로 요청한 글인지 확인한다."
nav: "tools"
tool: "editor_open_saved_draft"
generated: true
---

# 임시저장 글 불러오기

`editor_open_saved_draft` · 매번 물어봄 · 내 컴퓨터

임시저장한 글 하나를 지금 글쓰기 창에 불러온다. draftId 는 editor_save_draft 나 editor_list_saved_drafts 가 돌려준 글 번호다. 네이버 임시저장 목록에서 그 글을 누르는 방식이라, 불러온 뒤 저장하면 같은 임시저장 글이 갱신된다. 지금 창에 마지막 저장 뒤 바뀐 내용이 있으면 불러오지 않고 kind: unsaved-changes 로 멈춘다 — 먼저 editor_save_draft 로 저장하거나, 사용자가 그대로 넘어가도 된다고 했을 때만 discardUnsaved: true. true 이면 네이버가 지금 원고를 먼저 임시저장한 뒤 불러온다. 불러온 뒤 revision 이 바뀌므로 editor_read_document 로 다시 읽고 쓴다. unsaved-changes 의 lastSave 는 이 글쓰기 페이지가 마지막으로 확인한 저장(네이버 자동저장 포함)이라 불러오려는 글 번호와 다를 수 있고, revision 이 null 이면 이 도구가 저장한 것이 아니다. 불러오지 못했을 때(open-unconfirmed)는 trace 로 상황을 알린다: pressed(글을 눌렀는지), readObserved(네이버가 그 글을 읽었는지), revisionBefore·revisionNow·revisionChanged. revisionChanged 가 true 이면 편집기 문서가 이미 바뀌었을 수 있어 retryable 이 false 이며, 다시 열기 전에 editor_read_document 로 요청한 글인지 확인한다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `draftId` | 문자열 | O | 불러올 임시저장 글 번호. |
| `discardUnsaved` | 참/거짓 | X | 저장하지 않은 변경이 있어도 불러온다. 네이버가 지금 원고를 먼저 임시저장한다. 사용자가 그래도 된다고 했을 때만 true. |

## 함께 쓰는 도구

- [임시저장](/tools/editor-control/editor_save_draft/) `editor_save_draft`
- [임시저장 목록](/tools/editor-control/editor_list_saved_drafts/) `editor_list_saved_drafts`
- [문서 전체 읽기](/tools/editor-control/editor_read_document/) `editor_read_document`
- [내부 링크 제안](/tools/editor-control/internal_links/) `internal_links`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
