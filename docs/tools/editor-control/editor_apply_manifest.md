---
layout: "dl-tool"
title: "글 전체 적용 (제목·본문·이미지)"
description: "제목·본문·이미지를 한 번에 순서대로 적용한다. 같은 operationId 로 다시 부르면 이미 적용된 단계는 건너뛰고 멈춘 곳부터 이어서 한다 — 중간에 끊긴 작업을 그대로 다시 불러도 같은 문단이나 이미지가 두 번 들어가지 않는다. 사람이 지켜보지 않는 연속 작업에 쓰고, 한 단계씩 결과를 보며 판단해야 할 때는 개별 editor_* 도구를 쓴다. 창을 열거나 정리하는 일은 포함하지 않으니 먼저 editor_open_window 로 준비한다."
nav: "tools"
tool: "editor_apply_manifest"
generated: true
---

# 글 전체 적용 (제목·본문·이미지)

`editor_apply_manifest` · 매번 물어봄 · 내 컴퓨터

제목·본문·이미지를 한 번에 순서대로 적용한다. 같은 operationId 로 다시 부르면 이미 적용된 단계는 건너뛰고 멈춘 곳부터 이어서 한다 — 중간에 끊긴 작업을 그대로 다시 불러도 같은 문단이나 이미지가 두 번 들어가지 않는다. 사람이 지켜보지 않는 연속 작업에 쓰고, 한 단계씩 결과를 보며 판단해야 할 때는 개별 editor_* 도구를 쓴다. 창을 열거나 정리하는 일은 포함하지 않으니 먼저 editor_open_window 로 준비한다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `operationId` | 문자열 | O | 이 작업의 고유 id. 재시도할 때 같은 값을 다시 보내야 이어서 진행한다. |
| `steps` | 목록 | O | 적용할 단계. 배열 순서대로 실행한다. |

## 함께 쓰는 도구

- [글쓰기 창 열기](/tools/editor-control/editor_open_window/) `editor_open_window`
- [내부 링크 제안](/tools/editor-control/internal_links/) `internal_links`
- [편집기 창 정리 (하나만 남기고 닫기)](/tools/editor-control/editor_reduce_windows/) `editor_reduce_windows`
- [현재 글 읽기](/tools/editor-control/editor_read/) `editor_read`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
