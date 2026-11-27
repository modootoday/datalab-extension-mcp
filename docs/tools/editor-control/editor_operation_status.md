---
layout: "dl-tool"
title: "작업 적용 확인"
description: "operationId 를 받는 글쓰기 도구(스키마에 operationId 가 있는 것 전부, 예:editor_insert_draft·editor_replace·editor_set_title·editor_insert_image·editor_apply_styles·editor_type_text·editor_set_list)로 보낸 작업이 실제로 적용됐는지 확인한다. 응답이 끊겼거나 시간이 초과됐을 때 같은 작업을 다시 보내기 전에 부른다. state: succeeded(적용됨, 다시 보내지 말 것) / not_applied(적용 안 됨, 같은 operationId 로 다시 보내도 안전) / in_progress(실행 중) / unverified(판정 불가, editor_read_document 로 확인) / unknown(기록 없음)."
nav: "tools"
tool: "editor_operation_status"
generated: true
---

# 작업 적용 확인

`editor_operation_status` · 바로 조회 · 내 컴퓨터

operationId 를 받는 글쓰기 도구(스키마에 operationId 가 있는 것 전부, 예:editor_insert_draft·editor_replace·editor_set_title·editor_insert_image·editor_apply_styles·editor_type_text·editor_set_list)로 보낸 작업이 실제로 적용됐는지 확인한다. 응답이 끊겼거나 시간이 초과됐을 때 같은 작업을 다시 보내기 전에 부른다. state: succeeded(적용됨, 다시 보내지 말 것) / not_applied(적용 안 됨, 같은 operationId 로 다시 보내도 안전) / in_progress(실행 중) / unverified(판정 불가, editor_read_document 로 확인) / unknown(기록 없음).

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `operationId` | 문자열 | O | 확인할 작업에 붙였던 operationId |

## 함께 쓰는 도구

- [에디터에 초안 삽입](/tools/editor-control/editor_insert_draft/) `editor_insert_draft`
- [본문 전체 교체](/tools/editor-control/editor_replace/) `editor_replace`
- [제목 설정](/tools/editor-control/editor_set_title/) `editor_set_title`
- [이미지 삽입](/tools/editor-control/editor_insert_image/) `editor_insert_image`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
