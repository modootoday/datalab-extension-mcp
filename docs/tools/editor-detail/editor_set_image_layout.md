---
layout: "dl-tool"
title: "이미지 배치"
description: "글쓰기 창 본문에 이미 있는 이미지의 정렬(align)과 표시 방식(contentMode)을 바꾼다. 이미지는 editor_read_document 가 돌려준 componentId 로 고른다. 규칙마다 요청한 값(requested)과 적용 뒤 문서를 다시 읽은 값(observed), 맞았는지(applied)를 돌려준다. 이미지가 같은 파일로 그대로 남는지 확인하고, 바뀌면 되돌린 뒤 content-changed 로 멈춘다. contentMode 중 어떤 값을 받는지는 계정의 편집기 설정이 정하므로 안 받으면 applied 가 false 다. 이 도구는 캡션을 바꾸지 않는다. 캡션 글자는 editor_set_image_caption 으로 쓰고 지운다. 캡션 글자의 서식(굵게, 색 등)은 바꿀 수 없다. 대체텍스트는 업로드 때 파일 이름으로 채워지고 편집기에 저장되는 설정 방법이 없어 지원하지 않는다. 이미지의 픽셀 크기도 정할 수 없고, 보이는 너비는 contentMode 로만 고른다. 이미지를 새로 넣는 것은 editor_insert_image 를 쓴다."
nav: "tools"
tool: "editor_set_image_layout"
generated: true
---

# 이미지 배치

`editor_set_image_layout` · 매번 물어봄 · 내 컴퓨터

글쓰기 창 본문에 이미 있는 이미지의 정렬(align)과 표시 방식(contentMode)을 바꾼다. 이미지는 editor_read_document 가 돌려준 componentId 로 고른다. 규칙마다 요청한 값(requested)과 적용 뒤 문서를 다시 읽은 값(observed), 맞았는지(applied)를 돌려준다. 이미지가 같은 파일로 그대로 남는지 확인하고, 바뀌면 되돌린 뒤 content-changed 로 멈춘다. contentMode 중 어떤 값을 받는지는 계정의 편집기 설정이 정하므로 안 받으면 applied 가 false 다. 이 도구는 캡션을 바꾸지 않는다. 캡션 글자는 editor_set_image_caption 으로 쓰고 지운다. 캡션 글자의 서식(굵게, 색 등)은 바꿀 수 없다. 대체텍스트는 업로드 때 파일 이름으로 채워지고 편집기에 저장되는 설정 방법이 없어 지원하지 않는다. 이미지의 픽셀 크기도 정할 수 없고, 보이는 너비는 contentMode 로만 고른다. 이미지를 새로 넣는 것은 editor_insert_image 를 쓴다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `rules` | 목록 | O | 적용할 규칙 목록. 하나는 이미지 하나와 그 배치다. |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [문서 전체 읽기](/tools/editor-control/editor_read_document/) `editor_read_document`
- [이미지 캡션 쓰기](/tools/editor-detail/editor_set_image_caption/) `editor_set_image_caption`
- [이미지 삽입](/tools/editor-control/editor_insert_image/) `editor_insert_image`
- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
