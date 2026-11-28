---
layout: "dl-tool"
title: "간격 맞추기"
description: "글쓰기 창 본문에서 여러 컴포넌트 뒤의 빈 문단 수를 한 번에 맞춘다. 이 편집기에는 문단 앞뒤 간격 설정이 없어서 간격은 빈 문단 개수로 만든다. 빈 문단 수는 뒤따르는 빈 글 컴포넌트와 다음 글 컴포넌트 맨 앞의 빈 문단을 센 것이고, 그 컴포넌트 자신의 끝에 있는 빈 문단은 세지도 지우지도 않는다. 단계는 결과를 말하는 방식이라 많으면 지우고 모자라면 넣고 이미 맞으면 unchanged 로 지나가므로, 첫 실패에서 멈춘 뒤 같은 단계를 그대로 다시 보내면 끝낸 곳은 건너뛴다. 본문 글·이미지·링크·다른 컴포넌트 순서가 바뀌면 그 단계를 되돌리고 content-changed 로 멈춘다. 컴포넌트의 첫 문단은 지울 수 없어 맨 앞 빈 문단이 한 칸 남을 수 있다."
nav: "tools"
tool: "editor_apply_layout"
generated: true
---

# 간격 맞추기

`editor_apply_layout` · 매번 물어봄 · 내 컴퓨터

글쓰기 창 본문에서 여러 컴포넌트 뒤의 빈 문단 수를 한 번에 맞춘다. 이 편집기에는 문단 앞뒤 간격 설정이 없어서 간격은 빈 문단 개수로 만든다. 빈 문단 수는 뒤따르는 빈 글 컴포넌트와 다음 글 컴포넌트 맨 앞의 빈 문단을 센 것이고, 그 컴포넌트 자신의 끝에 있는 빈 문단은 세지도 지우지도 않는다. 단계는 결과를 말하는 방식이라 많으면 지우고 모자라면 넣고 이미 맞으면 unchanged 로 지나가므로, 첫 실패에서 멈춘 뒤 같은 단계를 그대로 다시 보내면 끝낸 곳은 건너뛴다. 본문 글·이미지·링크·다른 컴포넌트 순서가 바뀌면 그 단계를 되돌리고 content-changed 로 멈춘다. 컴포넌트의 첫 문단은 지울 수 없어 맨 앞 빈 문단이 한 칸 남을 수 있다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `steps` | 목록 | O | 간격을 맞출 단계 목록, 위에서부터 순서대로 실행한다. |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`
- [문단 서식 적용](/tools/editor-detail/editor_set_paragraph_styles/) `editor_set_paragraph_styles`
- [이미지 배치](/tools/editor-detail/editor_set_image_layout/) `editor_set_image_layout`
- [컴포넌트 이동](/tools/editor-detail/editor_move_component/) `editor_move_component`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
