---
layout: "dl-tool"
title: "다른 사람의 블로그 — 이웃 신청 가능 여부 읽기"
description: "회원이 그 글 탭을 열어 두었거나(tab_open) 활성화해 둔(tab_focus) 상태여야 한다 — 없으면 도구가 탭을 하나 열어 처리한다. 이웃 신청 전에 알아야 할 것을 읽는다. groups 는 '이름:ok' 또는 '이름:full' 목록이고 full 인 그룹은 더 받을 수 없다. allFull 이 yes 면 어느 그룹에도 넣을 수 없다. alreadyBuddy 가 yes 면 이미 이웃이라 신청할 이유가 없다. requestPending 이 yes 면 신청이 이미 진행 중이라 다시 넣으면 같은 신청이 두 번 간다. spamFiltered 나 naverRefused 가 yes 면 네이버가 거절하며 naverMessage 에 그 이유가 담긴다. defaultGroup 은 그룹을 고르지 않았을 때 실제로 쓰이는 그룹이다. 아무것도 바꾸지 않는다."
nav: "tools"
tool: "pumasi_neighbor_state"
generated: true
---

# 다른 사람의 블로그 — 이웃 신청 가능 여부 읽기

`pumasi_neighbor_state` · 매번 물어봄 · 공개 데이터

회원이 그 글 탭을 열어 두었거나(tab_open) 활성화해 둔(tab_focus) 상태여야 한다 — 없으면 도구가 탭을 하나 열어 처리한다. 이웃 신청 전에 알아야 할 것을 읽는다. groups 는 '이름:ok' 또는 '이름:full' 목록이고 full 인 그룹은 더 받을 수 없다. allFull 이 yes 면 어느 그룹에도 넣을 수 없다. alreadyBuddy 가 yes 면 이미 이웃이라 신청할 이유가 없다. requestPending 이 yes 면 신청이 이미 진행 중이라 다시 넣으면 같은 신청이 두 번 간다. spamFiltered 나 naverRefused 가 yes 면 네이버가 거절하며 naverMessage 에 그 이유가 담긴다. defaultGroup 은 그룹을 고르지 않았을 때 실제로 쓰이는 그룹이다. 아무것도 바꾸지 않는다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `url` | 문자열 | O | 대상 블로그의 주소 또는 그 블로그 글의 주소. |

## 함께 쓰는 도구

- [내 브라우저 — 새 탭 열기](/tools/browser-tabs/tab_open/) `tab_open`
- [내 브라우저 — 그 탭을 앞으로](/tools/browser-tabs/tab_focus/) `tab_focus`
- [다른 사람의 글 — 내 공감 상태 읽기](/tools/pumasi/pumasi_like_state/) `pumasi_like_state`
- [다른 사람의 글 — 공감한 사람 명단 받기](/tools/pumasi/pumasi_reactors/) `pumasi_reactors`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
