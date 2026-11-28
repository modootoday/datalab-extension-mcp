---
layout: "dl-tool"
title: "새 글로 전환"
description: "같은 글쓰기 탭을 빈 새 글로 바꾼다. 마지막으로 확인된 임시저장 뒤에 바뀐 내용이 있으면 바꾸지 않고 kind 를 unsaved-changes 로 하고 멈춘다. 그때는 editor_save_draft 로 먼저 저장하고, 사용자가 그대로 넘어가도 된다고 했을 때만 discardUnsaved 를 true 로 다시 부르며, 그러면 네이버가 지금 원고를 먼저 임시저장한 뒤 전환한다. restorePopup 에 cancel 을 주면 새 글의 복원 창에서 취소만 눌러 닫고 확인은 누르지 않으며, 주지 않으면 복원 창을 건드리지 않는다. 결과의 newEditorReady 가 true 여야 빈 편집기가 준비된 것이다. restorePopup 의 present 가 null 이면 복원 창이 떴는지 모르는 것이지 없었던 것이 아니고, error 에 그 이유가 온다."
nav: "tools"
tool: "editor_new_post"
generated: true
---

# 새 글로 전환

`editor_new_post` · 매번 물어봄 · 내 컴퓨터

같은 글쓰기 탭을 빈 새 글로 바꾼다. 마지막으로 확인된 임시저장 뒤에 바뀐 내용이 있으면 바꾸지 않고 kind 를 unsaved-changes 로 하고 멈춘다. 그때는 editor_save_draft 로 먼저 저장하고, 사용자가 그대로 넘어가도 된다고 했을 때만 discardUnsaved 를 true 로 다시 부르며, 그러면 네이버가 지금 원고를 먼저 임시저장한 뒤 전환한다. restorePopup 에 cancel 을 주면 새 글의 복원 창에서 취소만 눌러 닫고 확인은 누르지 않으며, 주지 않으면 복원 창을 건드리지 않는다. 결과의 newEditorReady 가 true 여야 빈 편집기가 준비된 것이다. restorePopup 의 present 가 null 이면 복원 창이 떴는지 모르는 것이지 없었던 것이 아니고, error 에 그 이유가 온다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `discardUnsaved` | 참/거짓 | X | 저장하지 않은 변경이 있어도 새 글로 넘어간다. 네이버가 지금 원고를 먼저 임시저장한다. 사용자가 그래도 된다고 했을 때만 true. |
| `restorePopup` | 문자열 | X | 새 글에 복원 창이 뜨면 취소로 닫는다. 이전 글을 이어 쓰지 않고 새로 시작해도 된다고 정해진 흐름에서만 준다. |

## 함께 쓰는 도구

- [임시저장](/tools/editor-control/editor_save_draft/) `editor_save_draft`
- [내부 링크 제안](/tools/editor-control/internal_links/) `internal_links`
- [글쓰기 창 열기](/tools/editor-control/editor_open_window/) `editor_open_window`
- [편집기 창 정리 (하나만 남기고 닫기)](/tools/editor-control/editor_reduce_windows/) `editor_reduce_windows`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
