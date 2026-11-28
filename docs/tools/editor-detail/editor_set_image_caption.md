---
layout: "dl-tool"
title: "이미지 캡션 쓰기"
description: "글쓰기 창 본문의 이미지 하나에 캡션(사진 설명) 글자를 쓰거나 지운다. text 를 주면 지금 캡션을 그 글자로 바꾸고, text 를 비우거나 빼면 캡션을 지운다. 캡션은 서식 없는 한 줄 글이고 500자까지다. 줄바꿈, 이모지, 제어 문자는 넣을 수 없다. 이미 같은 글이면 바꾸지 않고 changed 가 false 다. 이미지 id 는 editor_read_document 로 고른다. editor_read_document 는 이미지의 캡션을 문자열이나 image 안이 아니라 그 컴포넌트의 caption 에 문단 배열로 돌려주고, 모양은 본문 문단과 같다. 예: { \"ctype\": \"image\", \"image\": { \"src\": \"...\" }, \"caption\": [{ \"text\": \"바다 사진\", ... }] }. 캡션이 비어 있으면 caption 이 없다. 에디터가 저장한 캡션을 읽어 확인하고, 요청대로 바뀌지 않으면 되돌린다."
nav: "tools"
tool: "editor_set_image_caption"
generated: true
---

# 이미지 캡션 쓰기

`editor_set_image_caption` · 매번 물어봄 · 내 컴퓨터

글쓰기 창 본문의 이미지 하나에 캡션(사진 설명) 글자를 쓰거나 지운다. text 를 주면 지금 캡션을 그 글자로 바꾸고, text 를 비우거나 빼면 캡션을 지운다. 캡션은 서식 없는 한 줄 글이고 500자까지다. 줄바꿈, 이모지, 제어 문자는 넣을 수 없다. 이미 같은 글이면 바꾸지 않고 changed 가 false 다. 이미지 id 는 editor_read_document 로 고른다. editor_read_document 는 이미지의 캡션을 문자열이나 image 안이 아니라 그 컴포넌트의 caption 에 문단 배열로 돌려주고, 모양은 본문 문단과 같다. 예: { "ctype": "image", "image": { "src": "..." }, "caption": [{ "text": "바다 사진", ... }] }. 캡션이 비어 있으면 caption 이 없다. 에디터가 저장한 캡션을 읽어 확인하고, 요청대로 바뀌지 않으면 되돌린다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `componentId` | 문자열 | O | 이미지 컴포넌트 id (editor_read_document). |
| `text` | 문자열 | X | 캡션 글자(이모지·줄바꿈·제어 문자 없이). 빈 문자열이면 캡션을 지운다. |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [문서 전체 읽기](/tools/editor-control/editor_read_document/) `editor_read_document`
- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`
- [문단 서식 적용](/tools/editor-detail/editor_set_paragraph_styles/) `editor_set_paragraph_styles`
- [간격 맞추기](/tools/editor-detail/editor_apply_layout/) `editor_apply_layout`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
