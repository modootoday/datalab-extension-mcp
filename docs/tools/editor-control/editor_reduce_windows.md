---
layout: "dl-tool"
title: "편집기 창 정리 (하나만 남기고 닫기)"
description: "편집기 창을 정리하거나, 다음 글을 쓰려고 빈 편집기로 되돌린다. mode 는 넷. 🔴 무인으로 돌고 있고 다음 글을 이어서 쓰려는 것이면 reuse-then-reset 을 써라 — 이전 원고에 마지막 임시저장 뒤 바뀐 내용이 있으면 임시저장하고 같은 탭을 빈 글쓰기 편집기로 전환한다. 아무것도 닫지 않으므로 사용자 개입이 필요 없다. keep-one = 기존 창 하나(사용자가 보고 있는 것)를 두고 나머지를 닫는다. close-then-open = 전부 닫은 뒤 새 창을 연다. open-then-close = 새 창을 먼저 열고 기존을 닫는다. 뒤의 셋은 닫기를 시도하는데, 🔴 닫기는 보장되지 않는다 — 사용자가 그 탭에서 여기저기 이동했다면 브라우저가 스크립트의 창 닫기를 거부하고, 그러면 사용자가 직접 닫아야 해서 무인 실행이 거기서 멈춘다. reuse-then-reset / close-then-open / open-then-close 는 글쓰기 창만. 결과 읽는 법: newEditorReady 가 true 여야 빈 편집기가 준비된 것이고, remaining 이 실제 남은 창 수, still_multiple 이면 편집 도구가 아직 막힌다. retryable 이 true 면 다시 시도해도 된다. saveDisposition 은 닫거나 전환하기 전 원고를 어떻게 했는지다: saved = 임시저장함, skipped-unchanged = 마지막 임시저장 뒤 바뀐 내용이 없어 저장하지 않음, not-saveable = 제목이나 본문이 비어 저장할 수 없음, unknown = 창이 여러 개이거나 읽지 못해 알 수 없음."
nav: "tools"
tool: "editor_reduce_windows"
generated: true
---

# 편집기 창 정리 (하나만 남기고 닫기)

`editor_reduce_windows` · 매번 물어봄 · 내 컴퓨터

편집기 창을 정리하거나, 다음 글을 쓰려고 빈 편집기로 되돌린다. mode 는 넷. 🔴 무인으로 돌고 있고 다음 글을 이어서 쓰려는 것이면 reuse-then-reset 을 써라 — 이전 원고에 마지막 임시저장 뒤 바뀐 내용이 있으면 임시저장하고 같은 탭을 빈 글쓰기 편집기로 전환한다. 아무것도 닫지 않으므로 사용자 개입이 필요 없다. keep-one = 기존 창 하나(사용자가 보고 있는 것)를 두고 나머지를 닫는다. close-then-open = 전부 닫은 뒤 새 창을 연다. open-then-close = 새 창을 먼저 열고 기존을 닫는다. 뒤의 셋은 닫기를 시도하는데, 🔴 닫기는 보장되지 않는다 — 사용자가 그 탭에서 여기저기 이동했다면 브라우저가 스크립트의 창 닫기를 거부하고, 그러면 사용자가 직접 닫아야 해서 무인 실행이 거기서 멈춘다. reuse-then-reset / close-then-open / open-then-close 는 글쓰기 창만. 결과 읽는 법: newEditorReady 가 true 여야 빈 편집기가 준비된 것이고, remaining 이 실제 남은 창 수, still_multiple 이면 편집 도구가 아직 막힌다. retryable 이 true 면 다시 시도해도 된다. saveDisposition 은 닫거나 전환하기 전 원고를 어떻게 했는지다: saved = 임시저장함, skipped-unchanged = 마지막 임시저장 뒤 바뀐 내용이 없어 저장하지 않음, not-saveable = 제목이나 본문이 비어 저장할 수 없음, unknown = 창이 여러 개이거나 읽지 못해 알 수 없음.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `surface` | 문자열 | O | 정리할 편집기 |
| `mode` | 문자열 | X | reuse-then-reset = 바뀐 내용이 있으면 임시저장한 뒤 같은 탭을 빈 글쓰기 편집기로 전환한다 — 아무것도 닫지 않아 무인 실행에서 유일하게 막히지 않는다. keep-one = 기존 창 하나를 두고 나머지를 닫는다 (기본). close-then-open = 전부 닫은 뒤 새로 하나 연다. open-then-close = 새로 하나 열고 기존을 닫는다. 앞의 것 외 셋은 글쓰기 창만 |

## 함께 쓰는 도구

- [내부 링크 제안](/tools/editor-control/internal_links/) `internal_links`
- [글쓰기 창 열기](/tools/editor-control/editor_open_window/) `editor_open_window`
- [현재 글 읽기](/tools/editor-control/editor_read/) `editor_read`
- [본문 구조 읽기](/tools/editor-control/editor_read_structure/) `editor_read_structure`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
