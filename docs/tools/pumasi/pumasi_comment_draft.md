---
layout: "dl-tool"
title: "다른 사람의 글 — 댓글칸에 넣기(등록은 안 누름)"
description: "회원이 그 글 탭을 열어 두었거나(tab_open) 활성화해 둔(tab_focus) 상태여야 한다 — 없으면 도구가 탭을 하나 열어 처리한다. 다른 사람의 블로그 글의 댓글칸에 주어진 글을 그대로 넣으며 문장을 다듬지 않는다. 댓글칸이 열려 있어야 하므로 pumasi_comment_open 을 먼저 부른다. submit 이 true 면 등록까지 누르고 false 면 넣은 뒤 멈춘다. true 는 실제 댓글을 남기므로 회원이 명시적으로 요청한 경우에만 쓴다."
nav: "tools"
tool: "pumasi_comment_draft"
generated: true
---

# 다른 사람의 글 — 댓글칸에 넣기(등록은 안 누름)

`pumasi_comment_draft` · 매번 물어봄 · 공개 데이터

회원이 그 글 탭을 열어 두었거나(tab_open) 활성화해 둔(tab_focus) 상태여야 한다 — 없으면 도구가 탭을 하나 열어 처리한다. 다른 사람의 블로그 글의 댓글칸에 주어진 글을 그대로 넣으며 문장을 다듬지 않는다. 댓글칸이 열려 있어야 하므로 pumasi_comment_open 을 먼저 부른다. submit 이 true 면 등록까지 누르고 false 면 넣은 뒤 멈춘다. true 는 실제 댓글을 남기므로 회원이 명시적으로 요청한 경우에만 쓴다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `url` | 문자열 | O | 댓글을 달 글의 주소. |
| `text` | 문자열 | O | 댓글 본문. 도구가 다듬지 않고 그대로 넣는다. |
| `submit` | 참/거짓 | O | true 면 등록까지 누른다. false 면 넣고 멈춘다. |
| `secret` | 참/거짓 | X | true 면 비밀댓글로 표시한다(글쓴이와 회원만 봄). 기본값 false. 그 글이 비밀댓글을 받지 않으면 공개로 쓰지 않고 거절한다. |

## 함께 쓰는 도구

- [내 브라우저 — 새 탭 열기](/tools/browser-tabs/tab_open/) `tab_open`
- [내 브라우저 — 그 탭을 앞으로](/tools/browser-tabs/tab_focus/) `tab_focus`
- [다른 사람의 글 — 댓글칸 열기](/tools/pumasi/pumasi_comment_open/) `pumasi_comment_open`
- [다른 사람의 글 — 내 공감 상태 읽기](/tools/pumasi/pumasi_like_state/) `pumasi_like_state`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
