---
layout: "dl-tool"
title: "다른 사람의 블로그 — 이웃추가 창 열기"
description: "다른 사람의 블로그에서 이웃추가 창을 연다. 글 주소와 블로그 첫 화면 주소 둘 다 되고, 그 탭이 없으면 도구가 탭을 하나 열어 처리한다. mode 는 창이 지금 어느 쪽으로 맞춰져 있는지이고 기본값은 one-way 다 — 상대가 서로이웃을 받는지는 pumasi_neighbor_state 가 답한다. 여는 것뿐이고 신청하지 않으며, 서로이웃으로 바꾸는 것은 pumasi_neighbor_draft 가 한다."
nav: "tools"
tool: "pumasi_neighbor_open"
generated: true
---

# 다른 사람의 블로그 — 이웃추가 창 열기

`pumasi_neighbor_open` · 매번 물어봄 · 공개 데이터

다른 사람의 블로그에서 이웃추가 창을 연다. 글 주소와 블로그 첫 화면 주소 둘 다 되고, 그 탭이 없으면 도구가 탭을 하나 열어 처리한다. mode 는 창이 지금 어느 쪽으로 맞춰져 있는지이고 기본값은 one-way 다 — 상대가 서로이웃을 받는지는 pumasi_neighbor_state 가 답한다. 여는 것뿐이고 신청하지 않으며, 서로이웃으로 바꾸는 것은 pumasi_neighbor_draft 가 한다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `url` | 문자열 | O | 대상 블로그의 글 주소 또는 블로그 주소. m.blog.naver.com/{블로그아이디} 형태도 된다. |

## 함께 쓰는 도구

- [다른 사람의 블로그 — 이웃 신청 가능 여부 읽기](/tools/pumasi/pumasi_neighbor_state/) `pumasi_neighbor_state`
- [다른 사람의 블로그 — 서로이웃 메시지 넣기(신청은 안 누름)](/tools/pumasi/pumasi_neighbor_draft/) `pumasi_neighbor_draft`
- [다른 사람의 글 — 내 공감 상태 읽기](/tools/pumasi/pumasi_like_state/) `pumasi_like_state`
- [다른 사람의 글 — 공감한 사람 명단 받기](/tools/pumasi/pumasi_reactors/) `pumasi_reactors`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
