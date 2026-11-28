---
layout: "dl-tool"
title: "장소 지도 넣기"
description: "글쓰기 창 본문의 한 컴포넌트 앞이나 뒤에 장소 지도를 하나 넣는다. 장소 이름(query)으로 에디터의 장소 검색을 돌려 그 결과의 첫 장소(resultIndex 0 이 기본, 4 까지)로 지도 컴포넌트를 만든다. 국내 장소만 찾는다. 기준 컴포넌트는 editor_read_document 의 id(componentId)로 고르며 position 은 after(기본)나 before 다. 응답의 name 과 address 가 실제로 고른 장소이니 원하던 곳이 아니면 editor_delete_components 로 지우고 이름을 더 구체적으로 적거나 resultIndex 를 바꿔 다시 부른다. 장소를 찾지 못했거나(not-found) 지도 이미지가 없거나(no-map) 요청한 자리에 안 들어가면(misplaced) 문서를 바꾸지 않거나 넣은 것을 지우고, 이유와 복원 여부는 kind: place-unconfirmed 로 알린다. 같은 호출을 되풀이하면 지도가 두 번 들어간다."
nav: "tools"
tool: "editor_insert_place"
generated: true
---

# 장소 지도 넣기

`editor_insert_place` · 매번 물어봄 · 내 컴퓨터

글쓰기 창 본문의 한 컴포넌트 앞이나 뒤에 장소 지도를 하나 넣는다. 장소 이름(query)으로 에디터의 장소 검색을 돌려 그 결과의 첫 장소(resultIndex 0 이 기본, 4 까지)로 지도 컴포넌트를 만든다. 국내 장소만 찾는다. 기준 컴포넌트는 editor_read_document 의 id(componentId)로 고르며 position 은 after(기본)나 before 다. 응답의 name 과 address 가 실제로 고른 장소이니 원하던 곳이 아니면 editor_delete_components 로 지우고 이름을 더 구체적으로 적거나 resultIndex 를 바꿔 다시 부른다. 장소를 찾지 못했거나(not-found) 지도 이미지가 없거나(no-map) 요청한 자리에 안 들어가면(misplaced) 문서를 바꾸지 않거나 넣은 것을 지우고, 이유와 복원 여부는 kind: place-unconfirmed 로 알린다. 같은 호출을 되풀이하면 지도가 두 번 들어간다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `query` | 문자열 | O | 찾을 장소 이름 (예: 서울특별시청). |
| `componentId` | 문자열 | O | 지도를 놓을 기준 컴포넌트 id (editor_read_document). |
| `position` | 문자열 | X | 기준 컴포넌트의 앞(before)이나 뒤(after). 기본 after. |
| `resultIndex` | 정수 | X | 검색 결과 중 몇 번째 장소를 쓸지. 기본 0(첫 번째). |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [문서 전체 읽기](/tools/editor-control/editor_read_document/) `editor_read_document`
- [컴포넌트 삭제](/tools/editor-detail/editor_delete_components/) `editor_delete_components`
- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`
- [문단 서식 적용](/tools/editor-detail/editor_set_paragraph_styles/) `editor_set_paragraph_styles`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
