---
layout: "dl-tool"
title: "대표 이미지 정하기"
description: "글쓰기 창 본문의 이미지 하나를 대표 이미지(썸네일)로 정한다. 이미지는 editor_read_document 에서 종류가 image 인 컴포넌트의 id(componentId)로 고른다. 지금 대표였던 이미지는 자동으로 풀리고, 정한 뒤 문서를 다시 읽어 그 이미지만 대표일 때만 성공으로 답한다. 이미 그 이미지가 대표이면 changed: false 로 답하고 바꾸지 않는다. 바뀌지 않으면 원래대로 되돌리고 kind: cover-unconfirmed 로 이유(reason: disabled 설정 꺼짐, not-eligible 이미지 조건 미충족, threw 오류, not-applied 반영 안 됨)와 복원 여부(restored), 전후 대표 상태와 에디터가 말한 사정(seen)을 알려 준다. 각 이미지가 대표인지는 editor_read_document 의 이미지 represent(boolean)로 읽는다. 이미지 자체와 캡션은 건드리지 않는다."
nav: "tools"
tool: "editor_set_cover_image"
generated: true
---

# 대표 이미지 정하기

`editor_set_cover_image` · 매번 물어봄 · 내 컴퓨터

글쓰기 창 본문의 이미지 하나를 대표 이미지(썸네일)로 정한다. 이미지는 editor_read_document 에서 종류가 image 인 컴포넌트의 id(componentId)로 고른다. 지금 대표였던 이미지는 자동으로 풀리고, 정한 뒤 문서를 다시 읽어 그 이미지만 대표일 때만 성공으로 답한다. 이미 그 이미지가 대표이면 changed: false 로 답하고 바꾸지 않는다. 바뀌지 않으면 원래대로 되돌리고 kind: cover-unconfirmed 로 이유(reason: disabled 설정 꺼짐, not-eligible 이미지 조건 미충족, threw 오류, not-applied 반영 안 됨)와 복원 여부(restored), 전후 대표 상태와 에디터가 말한 사정(seen)을 알려 준다. 각 이미지가 대표인지는 editor_read_document 의 이미지 represent(boolean)로 읽는다. 이미지 자체와 캡션은 건드리지 않는다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `componentId` | 문자열 | O | 대표로 정할 이미지 컴포넌트 id (editor_read_document). |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [문서 전체 읽기](/tools/editor-control/editor_read_document/) `editor_read_document`
- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`
- [문단 서식 적용](/tools/editor-detail/editor_set_paragraph_styles/) `editor_set_paragraph_styles`
- [간격 맞추기](/tools/editor-detail/editor_apply_layout/) `editor_apply_layout`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
