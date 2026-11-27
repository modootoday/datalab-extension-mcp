---
layout: "dl-tool"
title: "글쓰기 창 열기"
description: "네이버 블로그 글쓰기 창을 새로 연다. 글쓰기 도구가 '창이 열려 있지 않다'고 답했을 때 이것으로 열고 다시 시도한다. title/markdown 을 주면 그 내용을 담은 채로 열리므로, 빈 창을 연 뒤 다시 써넣을 필요가 없다. 이미 창이 열려 있으면 새로 열지 않고 그 사실을 알려 준다. restorePopup: \"cancel\" 을 주면, 글쓰기 창에 작성 중이던 글을 이어 쓸지 묻는 복원 창이 떴을 때 그 창의 취소만 눌러 닫고 결과 restorePopup 으로 알려 준다. 이미 열린 창이 있을 때도 새 창을 열지 않고 그 창에서 같은 준비 확인과 취소 확인을 하고 결과를 restorePopup 으로 준다. 준비된 창이면 보통 { present: false, dismissed: false } 다: 확인하는 동안 창이 뜨지 않았으면 { present: false, dismissed: false }, 취소로 닫았으면 { present: true, dismissed: true }, 떴지만 닫지 못했으면 present: true 와 error. 편집기가 제때 뜨지 않았거나(editor-not-ready) 페이지가 예전 버전이거나(stale-page) 확인 자체가 실패하면(probe-failed) present 는 null 이고 error 에 그 이유가 있다. editor-not-ready 에는 기다린 시간 waitedMs 와 멈춘 단계 stage 가 함께 온다: tab-loading 은 글쓰기 탭 주소가 아직 잡히지 않은 것, loader-not-attached 는 탭은 있지만 확장이 아직 붙지 않은 것, controller-not-ready 는 확장은 붙었지만 편집기가 아직 준비되지 않은 것이다. 이때는 창이 떴는지 모르는 것이지 없었던 것이 아니다. restorePopup.timeline 에는 창 열기 요청을 받은 때부터 잰 밀리초가 있다: tabSelectedMs(글쓰기 탭을 찾은 때), loaderAnsweredMs(확장이 처음 답한 때), controllerReadyMs(편집기가 준비됐다고 처음 답한 때), probeSentMs(취소 확인을 보낸 때), probeAnsweredMs(취소 확인이 답한 때), 일어나지 않은 단계는 null 이다. lastRelayError 는 마지막으로 본 전달 실패 코드(no-agent·no-matching-tab·timeout 등) 또는 null, readinessAttempts 는 준비 확인을 몇 번 했는지다. 확인은 누르지 않는다. 주지 않으면 복원 창을 건드리지 않는다."
nav: "tools"
tool: "editor_open_window"
generated: true
---

# 글쓰기 창 열기

`editor_open_window` · 매번 물어봄 · 내 컴퓨터

네이버 블로그 글쓰기 창을 새로 연다. 글쓰기 도구가 '창이 열려 있지 않다'고 답했을 때 이것으로 열고 다시 시도한다. title/markdown 을 주면 그 내용을 담은 채로 열리므로, 빈 창을 연 뒤 다시 써넣을 필요가 없다. 이미 창이 열려 있으면 새로 열지 않고 그 사실을 알려 준다. restorePopup: "cancel" 을 주면, 글쓰기 창에 작성 중이던 글을 이어 쓸지 묻는 복원 창이 떴을 때 그 창의 취소만 눌러 닫고 결과 restorePopup 으로 알려 준다. 이미 열린 창이 있을 때도 새 창을 열지 않고 그 창에서 같은 준비 확인과 취소 확인을 하고 결과를 restorePopup 으로 준다. 준비된 창이면 보통 { present: false, dismissed: false } 다: 확인하는 동안 창이 뜨지 않았으면 { present: false, dismissed: false }, 취소로 닫았으면 { present: true, dismissed: true }, 떴지만 닫지 못했으면 present: true 와 error. 편집기가 제때 뜨지 않았거나(editor-not-ready) 페이지가 예전 버전이거나(stale-page) 확인 자체가 실패하면(probe-failed) present 는 null 이고 error 에 그 이유가 있다. editor-not-ready 에는 기다린 시간 waitedMs 와 멈춘 단계 stage 가 함께 온다: tab-loading 은 글쓰기 탭 주소가 아직 잡히지 않은 것, loader-not-attached 는 탭은 있지만 확장이 아직 붙지 않은 것, controller-not-ready 는 확장은 붙었지만 편집기가 아직 준비되지 않은 것이다. 이때는 창이 떴는지 모르는 것이지 없었던 것이 아니다. restorePopup.timeline 에는 창 열기 요청을 받은 때부터 잰 밀리초가 있다: tabSelectedMs(글쓰기 탭을 찾은 때), loaderAnsweredMs(확장이 처음 답한 때), controllerReadyMs(편집기가 준비됐다고 처음 답한 때), probeSentMs(취소 확인을 보낸 때), probeAnsweredMs(취소 확인이 답한 때), 일어나지 않은 단계는 null 이다. lastRelayError 는 마지막으로 본 전달 실패 코드(no-agent·no-matching-tab·timeout 등) 또는 null, readinessAttempts 는 준비 확인을 몇 번 했는지다. 확인은 누르지 않는다. 주지 않으면 복원 창을 건드리지 않는다.

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
