---
layout: "dl-tool"
title: "새 글로 전환"
description: "같은 글쓰기 탭을 빈 새 글로 바꾼다. 마지막으로 확인된 임시저장 뒤에 바뀐 내용이 있으면 바꾸지 않고 kind: unsaved-changes 로 멈춘다 — 먼저 editor_save_draft 로 저장하거나, 사용자가 그대로 넘어가도 된다고 했을 때만 discardUnsaved: true 로 다시 부른다. true 이면 네이버가 지금 원고를 먼저 임시저장한 뒤 전환한다. 결과 읽는 법은 editor_reduce_windows 의 reuse-then-reset 과 같다(newEditorReady 가 true 여야 준비된 것). restorePopup: \"cancel\" 을 주면, 새 글에 작성 중이던 글을 이어 쓸지 묻는 복원 창이 떴을 때 그 창의 취소만 눌러 닫고 결과 restorePopup 으로 알려 준다: 확인하는 동안 창이 뜨지 않았으면 { present: false, dismissed: false }, 취소로 닫았으면 { present: true, dismissed: true }, 떴지만 닫지 못했으면 present: true 와 error. 편집기가 제때 뜨지 않았거나(editor-not-ready) 페이지가 예전 버전이거나(stale-page) 확인 자체가 실패하면(probe-failed) present 는 null 이고 error 에 그 이유가 있다. editor-not-ready 에는 기다린 시간 waitedMs 와 멈춘 단계 stage(tab-loading, loader-not-attached, controller-not-ready)가 함께 온다. 이때는 창이 떴는지 모르는 것이지 없었던 것이 아니다. restorePopup.timeline 은 editor_open_window 의 것과 같은 단계별 밀리초(tabSelectedMs·loaderAnsweredMs·controllerReadyMs·probeSentMs·probeAnsweredMs, 없으면 null)와 lastRelayError·readinessAttempts 다. 확인은 누르지 않는다. 주지 않으면 복원 창을 건드리지 않는다."
nav: "tools"
tool: "editor_new_post"
generated: true
---

# 새 글로 전환

`editor_new_post` · 매번 물어봄 · 내 컴퓨터

같은 글쓰기 탭을 빈 새 글로 바꾼다. 마지막으로 확인된 임시저장 뒤에 바뀐 내용이 있으면 바꾸지 않고 kind: unsaved-changes 로 멈춘다 — 먼저 editor_save_draft 로 저장하거나, 사용자가 그대로 넘어가도 된다고 했을 때만 discardUnsaved: true 로 다시 부른다. true 이면 네이버가 지금 원고를 먼저 임시저장한 뒤 전환한다. 결과 읽는 법은 editor_reduce_windows 의 reuse-then-reset 과 같다(newEditorReady 가 true 여야 준비된 것). restorePopup: "cancel" 을 주면, 새 글에 작성 중이던 글을 이어 쓸지 묻는 복원 창이 떴을 때 그 창의 취소만 눌러 닫고 결과 restorePopup 으로 알려 준다: 확인하는 동안 창이 뜨지 않았으면 { present: false, dismissed: false }, 취소로 닫았으면 { present: true, dismissed: true }, 떴지만 닫지 못했으면 present: true 와 error. 편집기가 제때 뜨지 않았거나(editor-not-ready) 페이지가 예전 버전이거나(stale-page) 확인 자체가 실패하면(probe-failed) present 는 null 이고 error 에 그 이유가 있다. editor-not-ready 에는 기다린 시간 waitedMs 와 멈춘 단계 stage(tab-loading, loader-not-attached, controller-not-ready)가 함께 온다. 이때는 창이 떴는지 모르는 것이지 없었던 것이 아니다. restorePopup.timeline 은 editor_open_window 의 것과 같은 단계별 밀리초(tabSelectedMs·loaderAnsweredMs·controllerReadyMs·probeSentMs·probeAnsweredMs, 없으면 null)와 lastRelayError·readinessAttempts 다. 확인은 누르지 않는다. 주지 않으면 복원 창을 건드리지 않는다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `discardUnsaved` | 참/거짓 | X | 저장하지 않은 변경이 있어도 새 글로 넘어간다. 네이버가 지금 원고를 먼저 임시저장한다. 사용자가 그래도 된다고 했을 때만 true. |
| `restorePopup` | 문자열 | X | 새 글에 복원 창이 뜨면 취소로 닫는다. 이전 글을 이어 쓰지 않고 새로 시작해도 된다고 정해진 흐름에서만 준다. |

## 함께 쓰는 도구

- [임시저장](/tools/editor-control/editor_save_draft/) `editor_save_draft`
- [편집기 창 정리 (하나만 남기고 닫기)](/tools/editor-control/editor_reduce_windows/) `editor_reduce_windows`
- [글쓰기 창 열기](/tools/editor-control/editor_open_window/) `editor_open_window`
- [내부 링크 제안](/tools/editor-control/internal_links/) `internal_links`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
