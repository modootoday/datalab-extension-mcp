---
layout: "dl-tool"
title: "실행 취소"
description: "글쓰기 창의 직전 편집(덮어쓰기·본문 삽입·제목 변경·이미지 삽입 등)을 되돌린다. 사용자가 '되돌려줘', '방금 거 취소', '실행 취소', '원래대로'라고 하면 사용한다. 사용자가 직접 친 글자는 에디터의 실행취소로 한 단계씩 되돌리고, 이 도구로 넣은 편집은 그 편집 직전 상태로 되돌린다 — 그 뒤에 사용자가 직접 쓴 내용도 함께 되돌아간다. 여러 번 부르면 계속 이전 상태로 되돌린다. 에디터의 기록에 같은 상태가 겹쳐 있어도 문서가 실제로 바뀔 때까지 한 번의 호출 안에서 몇 단계 더 되돌리고, 응답의 changed·revisionBefore·revisionAfter 로 바뀌었는지 알려 준다. changed 가 false 이면 더 되돌릴 이전 상태가 없는 것이다."
nav: "tools"
tool: "editor_undo"
generated: true
---

# 실행 취소

`editor_undo` · 매번 물어봄 · 내 컴퓨터

글쓰기 창의 직전 편집(덮어쓰기·본문 삽입·제목 변경·이미지 삽입 등)을 되돌린다. 사용자가 '되돌려줘', '방금 거 취소', '실행 취소', '원래대로'라고 하면 사용한다. 사용자가 직접 친 글자는 에디터의 실행취소로 한 단계씩 되돌리고, 이 도구로 넣은 편집은 그 편집 직전 상태로 되돌린다 — 그 뒤에 사용자가 직접 쓴 내용도 함께 되돌아간다. 여러 번 부르면 계속 이전 상태로 되돌린다. 에디터의 기록에 같은 상태가 겹쳐 있어도 문서가 실제로 바뀔 때까지 한 번의 호출 안에서 몇 단계 더 되돌리고, 응답의 changed·revisionBefore·revisionAfter 로 바뀌었는지 알려 준다. changed 가 false 이면 더 되돌릴 이전 상태가 없는 것이다.

## AI가 넘기는 값

AI가 넘기는 값이 없어요.

## 함께 쓰는 도구

- [내부 링크 제안](/tools/editor-control/internal_links/) `internal_links`
- [글쓰기 창 열기](/tools/editor-control/editor_open_window/) `editor_open_window`
- [편집기 창 정리 (하나만 남기고 닫기)](/tools/editor-control/editor_reduce_windows/) `editor_reduce_windows`
- [현재 글 읽기](/tools/editor-control/editor_read/) `editor_read`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
