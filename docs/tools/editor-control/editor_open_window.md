---
layout: "dl-tool"
title: "글쓰기 창 열기"
description: "네이버 블로그 글쓰기 창을 새로 연다. 글쓰기 도구가 '창이 열려 있지 않다'고 답했을 때 이것으로 열고 다시 시도하며, title·markdown 을 주면 그 내용을 담은 채로 열린다. 이미 창이 열려 있으면 새로 열지 않고 그 사실을 알려 준다. restorePopup 에 cancel 을 주면 이어 쓰기를 묻는 복원 창의 취소만 눌러 닫고 확인은 누르지 않으며, 주지 않으면 복원 창을 건드리지 않는다. 결과 restorePopup 의 present 가 null 이면 창이 떴는지 모르는 것이지 없었던 것이 아니고, error 에 editor-not-ready·stale-page·probe-failed 같은 이유가 온다. editor-not-ready 의 stage 는 준비가 멈춘 단계다."
nav: "tools"
tool: "editor_open_window"
generated: true
---

# 글쓰기 창 열기

`editor_open_window` · 매번 물어봄 · 내 컴퓨터

네이버 블로그 글쓰기 창을 새로 연다. 글쓰기 도구가 '창이 열려 있지 않다'고 답했을 때 이것으로 열고 다시 시도하며, title·markdown 을 주면 그 내용을 담은 채로 열린다. 이미 창이 열려 있으면 새로 열지 않고 그 사실을 알려 준다. restorePopup 에 cancel 을 주면 이어 쓰기를 묻는 복원 창의 취소만 눌러 닫고 확인은 누르지 않으며, 주지 않으면 복원 창을 건드리지 않는다. 결과 restorePopup 의 present 가 null 이면 창이 떴는지 모르는 것이지 없었던 것이 아니고, error 에 editor-not-ready·stale-page·probe-failed 같은 이유가 온다. editor-not-ready 의 stage 는 준비가 멈춘 단계다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `title` | 문자열 | X | 새로 여는 글의 제목 (선택). markdown 의 '# 제목' 줄보다 이 값이 우선한다. |
| `markdown` | 문자열 | X | 새 글의 본문 마크다운 (선택) |
| `restorePopup` | 문자열 | X | 글쓰기 창에 복원 창이 뜨면 취소로 닫는다. 이미 열린 창이면 그 창에서 확인한다. 이전 글을 이어 쓰지 않고 새로 시작해도 된다고 정해진 흐름에서만 준다. |

## 함께 쓰는 도구

- [내부 링크 제안](/tools/editor-control/internal_links/) `internal_links`
- [편집기 창 정리 (하나만 남기고 닫기)](/tools/editor-control/editor_reduce_windows/) `editor_reduce_windows`
- [현재 글 읽기](/tools/editor-control/editor_read/) `editor_read`
- [본문 구조 읽기](/tools/editor-control/editor_read_structure/) `editor_read_structure`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
