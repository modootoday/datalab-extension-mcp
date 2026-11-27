---
layout: "dl-tool"
title: "임시저장 목록"
description: "내 블로그의 네이버 임시저장 글 목록을 최근 저장 순으로 읽는다. 각 글의 draftId(글 번호), 제목, 저장 시각을 돌려준다. editor_save_draft 가 돌려준 draftId 가 목록에 있는지 확인할 때 쓴다. 글 내용은 돌려주지 않는다. 목록은 네이버가 한 번에 주는 최근 글에서 앞쪽 limit 개(최대 50개)만 돌려주고 다음 쪽은 읽을 수 없다. total 은 네이버가 센 전체 수이고, hasMore 가 true 면 돌려준 것보다 더 있다. editor_open_saved_draft 로 다른 글을 열면 네이버의 확인 창에 저장으로 답하므로, 지금 창에 내용이 있으면 바뀐 것이 없어도 그 글이 다시 임시저장되어 이 목록의 저장 시각(savedAt)이 새로 바뀐다."
nav: "tools"
tool: "editor_list_saved_drafts"
generated: true
---

# 임시저장 목록

`editor_list_saved_drafts` · 바로 조회 · 내 컴퓨터

내 블로그의 네이버 임시저장 글 목록을 최근 저장 순으로 읽는다. 각 글의 draftId(글 번호), 제목, 저장 시각을 돌려준다. editor_save_draft 가 돌려준 draftId 가 목록에 있는지 확인할 때 쓴다. 글 내용은 돌려주지 않는다. 목록은 네이버가 한 번에 주는 최근 글에서 앞쪽 limit 개(최대 50개)만 돌려주고 다음 쪽은 읽을 수 없다. total 은 네이버가 센 전체 수이고, hasMore 가 true 면 돌려준 것보다 더 있다. editor_open_saved_draft 로 다른 글을 열면 네이버의 확인 창에 저장으로 답하므로, 지금 창에 내용이 있으면 바뀐 것이 없어도 그 글이 다시 임시저장되어 이 목록의 저장 시각(savedAt)이 새로 바뀐다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `limit` | 정수 | X | 돌려줄 글 수. 기본 20, 최대 50. |

## 함께 쓰는 도구

- [임시저장](/tools/editor-control/editor_save_draft/) `editor_save_draft`
- [임시저장 글 불러오기](/tools/editor-control/editor_open_saved_draft/) `editor_open_saved_draft`
- [내부 링크 제안](/tools/editor-control/internal_links/) `internal_links`
- [글쓰기 창 열기](/tools/editor-control/editor_open_window/) `editor_open_window`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
