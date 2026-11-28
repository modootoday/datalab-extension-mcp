---
layout: "dl-tool"
title: "작업 적용 확인"
description: "operationId 를 받는 글쓰기 도구(스키마에 operationId 가 있는 것 전부)로 보낸 작업이 실제로 적용됐는지 확인한다. 응답이 끊겼거나 시간이 초과됐을 때 같은 작업을 다시 보내기 전에 부르며, 아무것도 바꾸지 않는다. state 가 succeeded 면 이미 적용된 것이라 다시 보낼 일이 아니고, not_applied 면 같은 operationId 로 다시 보내도 안전하다. in_progress 는 아직 실행 중, unknown 은 기록이 없는 것이고, unverified 면 판정할 수 없어 editor_read_document 로 문서를 읽어 확인한다."
nav: "tools"
tool: "editor_operation_status"
generated: true
---

# 작업 적용 확인

`editor_operation_status` · 바로 조회 · 내 컴퓨터

operationId 를 받는 글쓰기 도구(스키마에 operationId 가 있는 것 전부)로 보낸 작업이 실제로 적용됐는지 확인한다. 응답이 끊겼거나 시간이 초과됐을 때 같은 작업을 다시 보내기 전에 부르며, 아무것도 바꾸지 않는다. state 가 succeeded 면 이미 적용된 것이라 다시 보낼 일이 아니고, not_applied 면 같은 operationId 로 다시 보내도 안전하다. in_progress 는 아직 실행 중, unknown 은 기록이 없는 것이고, unverified 면 판정할 수 없어 editor_read_document 로 문서를 읽어 확인한다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `operationId` | 문자열 | O | 확인할 작업에 붙였던 operationId |

## 함께 쓰는 도구

- [문서 전체 읽기](/tools/editor-control/editor_read_document/) `editor_read_document`
- [내부 링크 제안](/tools/editor-control/internal_links/) `internal_links`
- [글쓰기 창 열기](/tools/editor-control/editor_open_window/) `editor_open_window`
- [편집기 창 정리 (하나만 남기고 닫기)](/tools/editor-control/editor_reduce_windows/) `editor_reduce_windows`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
