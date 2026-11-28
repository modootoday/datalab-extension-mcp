---
layout: "dl-tool"
title: "서로이웃 신청 취소 — 보낸 신청 거두기"
description: "회원이 이미 보낸 서로이웃 신청을 취소한다. pumasi_neighbor_open 을 먼저 불러 신청 진행 중 확인 창이 떠 있어야 한다 — 그 창의 확인 버튼을 누르는 것이 취소다. 진행 중인 신청이 없으면 no-pending-request 로 거절한다. 취소된 뒤 실제로 사라졌는지는 pumasi_neighbor_state 를 다시 불러 확인한다."
nav: "tools"
tool: "pumasi_neighbor_cancel"
generated: true
---

# 서로이웃 신청 취소 — 보낸 신청 거두기

`pumasi_neighbor_cancel` · 매번 물어봄 · 공개 데이터

회원이 이미 보낸 서로이웃 신청을 취소한다. pumasi_neighbor_open 을 먼저 불러 신청 진행 중 확인 창이 떠 있어야 한다 — 그 창의 확인 버튼을 누르는 것이 취소다. 진행 중인 신청이 없으면 no-pending-request 로 거절한다. 취소된 뒤 실제로 사라졌는지는 pumasi_neighbor_state 를 다시 불러 확인한다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `url` | 문자열 | O | 신청을 취소할 블로그의 글 주소. |

## 함께 쓰는 도구

- [다른 사람의 블로그 — 이웃추가 창 열기](/tools/pumasi/pumasi_neighbor_open/) `pumasi_neighbor_open`
- [다른 사람의 블로그 — 이웃 신청 가능 여부 읽기](/tools/pumasi/pumasi_neighbor_state/) `pumasi_neighbor_state`
- [다른 사람의 글 — 내 공감 상태 읽기](/tools/pumasi/pumasi_like_state/) `pumasi_like_state`
- [다른 사람의 글 — 공감한 사람 명단 받기](/tools/pumasi/pumasi_reactors/) `pumasi_reactors`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
