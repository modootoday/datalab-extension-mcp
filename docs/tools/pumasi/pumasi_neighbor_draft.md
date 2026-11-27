---
layout: "dl-tool"
title: "다른 사람의 블로그 — 서로이웃 메시지 넣기(신청은 안 누름)"
description: "회원이 그 글 탭을 열어 두었거나(tab_open) 활성화해 둔(tab_focus) 상태여야 한다 — 없으면 도구가 탭을 하나 열어 처리한다. 다른 사람의 블로그의 서로이웃 신청 메시지칸에 주어진 글을 그대로 넣으며 문장을 다듬지 않는다. 신청 창이 열려 있어야 하므로 pumasi_neighbor_open 을 먼저 부른다. group 을 생략하면 네이버가 첫 그룹을 쓰며, 정원이 찬 그룹이면 넣지 않고 거절한다. submit 이 true 면 신청까지 누르고 false 면 넣은 뒤 멈춘다. true 는 실제 신청을 보내므로 회원이 명시적으로 요청한 경우에만 쓴다."
nav: "tools"
tool: "pumasi_neighbor_draft"
generated: true
---

# 다른 사람의 블로그 — 서로이웃 메시지 넣기(신청은 안 누름)

`pumasi_neighbor_draft` · 매번 물어봄 · 공개 데이터

회원이 그 글 탭을 열어 두었거나(tab_open) 활성화해 둔(tab_focus) 상태여야 한다 — 없으면 도구가 탭을 하나 열어 처리한다. 다른 사람의 블로그의 서로이웃 신청 메시지칸에 주어진 글을 그대로 넣으며 문장을 다듬지 않는다. 신청 창이 열려 있어야 하므로 pumasi_neighbor_open 을 먼저 부른다. group 을 생략하면 네이버가 첫 그룹을 쓰며, 정원이 찬 그룹이면 넣지 않고 거절한다. submit 이 true 면 신청까지 누르고 false 면 넣은 뒤 멈춘다. true 는 실제 신청을 보내므로 회원이 명시적으로 요청한 경우에만 쓴다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `url` | 문자열 | O | 대상 블로그의 주소 또는 그 블로그 글의 주소. |
| `text` | 문자열 | O | 서로이웃 신청 메시지. 도구가 다듬지 않고 그대로 넣는다. 400자까지. |
| `submit` | 참/거짓 | O | true 면 신청까지 누른다. false 면 넣고 멈춘다. |
| `group` | 문자열 | X | 이웃 그룹 이름. 생략하면 네이버 기본값인 목록 첫 그룹으로 간다. |

## 함께 쓰는 도구

- [내 브라우저 — 새 탭 열기](/tools/browser-tabs/tab_open/) `tab_open`
- [내 브라우저 — 그 탭을 앞으로](/tools/browser-tabs/tab_focus/) `tab_focus`
- [다른 사람의 블로그 — 이웃추가 창 열기](/tools/pumasi/pumasi_neighbor_open/) `pumasi_neighbor_open`
- [다른 사람의 글 — 내 공감 상태 읽기](/tools/pumasi/pumasi_like_state/) `pumasi_like_state`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
