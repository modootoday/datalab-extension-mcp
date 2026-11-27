---
layout: "dl-tool"
title: "링크 카드 넣기"
description: "글쓰기 창 본문의 한 컴포넌트 앞이나 뒤에 링크 카드를 넣는다. 주소(url)는 http 나 https 로 시작하는 웹 주소이고, 기준 컴포넌트는 editor_read_document 의 id(componentId)로 고르며 position 은 after(기본)나 before 다. 제목, 설명, 썸네일은 에디터가 그 주소를 네이버 쪽에서 가져온 것으로 채운다 — 서명이 있고 보여 줄 내용(제목이나 도메인이나 설명, 영상이면 html)이 있는 카드만 넣고, 영상 같은 주소는 영상 카드로 바뀔 수 있어 그때 ctype 이 oembed 다. 가져오지 못했거나(not-crawled) 가져온 것이 비어 빈 상자가 될 것이면(empty-card) 문서를 바꾸지 않고, 요청한 자리에 안 들어가면(misplaced) 넣은 것을 지운다. 이유와 복원 여부는 kind: link-card-unconfirmed 로 알린다. 카드 내용은 우리가 정할 수 없고 에디터가 가져온 것이다. 같은 호출을 되풀이하면 카드가 두 번 들어간다."
nav: "tools"
tool: "editor_insert_link_card"
generated: true
---

# 링크 카드 넣기

`editor_insert_link_card` · 매번 물어봄 · 내 컴퓨터

글쓰기 창 본문의 한 컴포넌트 앞이나 뒤에 링크 카드를 넣는다. 주소(url)는 http 나 https 로 시작하는 웹 주소이고, 기준 컴포넌트는 editor_read_document 의 id(componentId)로 고르며 position 은 after(기본)나 before 다. 제목, 설명, 썸네일은 에디터가 그 주소를 네이버 쪽에서 가져온 것으로 채운다 — 서명이 있고 보여 줄 내용(제목이나 도메인이나 설명, 영상이면 html)이 있는 카드만 넣고, 영상 같은 주소는 영상 카드로 바뀔 수 있어 그때 ctype 이 oembed 다. 가져오지 못했거나(not-crawled) 가져온 것이 비어 빈 상자가 될 것이면(empty-card) 문서를 바꾸지 않고, 요청한 자리에 안 들어가면(misplaced) 넣은 것을 지운다. 이유와 복원 여부는 kind: link-card-unconfirmed 로 알린다. 카드 내용은 우리가 정할 수 없고 에디터가 가져온 것이다. 같은 호출을 되풀이하면 카드가 두 번 들어간다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `url` | 문자열 | O | 카드로 만들 웹 주소 (http 또는 https). |
| `componentId` | 문자열 | O | 카드를 놓을 기준 컴포넌트 id (editor_read_document). |
| `position` | 문자열 | X | 기준 컴포넌트의 앞(before)이나 뒤(after). 기본 after. |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [문서 전체 읽기](/tools/editor-control/editor_read_document/) `editor_read_document`
- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`
- [문단 서식 적용](/tools/editor-detail/editor_set_paragraph_styles/) `editor_set_paragraph_styles`
- [간격 맞추기](/tools/editor-detail/editor_apply_layout/) `editor_apply_layout`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
