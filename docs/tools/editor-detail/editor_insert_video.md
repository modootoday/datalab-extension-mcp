---
layout: "dl-tool"
title: "영상 넣기"
description: "글쓰기 창 본문의 한 컴포넌트 앞이나 뒤에 영상 하나를 넣는다. 2MB 이하 파일을 주면 에디터의 영상 올리기로 블로그에 올리고 영상 칸을 만들며, 기준 컴포넌트는 본문 읽기 결과의 componentId 로 고른다. 에디터가 형식이나 길이를 받지 않으면 문서를 바꾸지 않고 사유를 알린다. 영상 칸은 바로 생기고 업로드는 뒤에서 이어지므로 응답의 phase 가 processing 이면 아직 끝나지 않은 것이다(done 이어야 끝). 올리지 못했거나(upload-failed) 요청한 자리에 안 들어가면(misplaced) 만든 칸을 지우고 이유와 복원 여부를 kind 를 video-unconfirmed 로 해 알린다. 올라간 영상은 성공해도 실패해도 블로그 영상 보관함에 남을 수 있다. 같은 호출을 되풀이하면 영상이 두 번 들어간다."
nav: "tools"
tool: "editor_insert_video"
generated: true
---

# 영상 넣기

`editor_insert_video` · 매번 물어봄 · 내 컴퓨터

글쓰기 창 본문의 한 컴포넌트 앞이나 뒤에 영상 하나를 넣는다. 2MB 이하 파일을 주면 에디터의 영상 올리기로 블로그에 올리고 영상 칸을 만들며, 기준 컴포넌트는 본문 읽기 결과의 componentId 로 고른다. 에디터가 형식이나 길이를 받지 않으면 문서를 바꾸지 않고 사유를 알린다. 영상 칸은 바로 생기고 업로드는 뒤에서 이어지므로 응답의 phase 가 processing 이면 아직 끝나지 않은 것이다(done 이어야 끝). 올리지 못했거나(upload-failed) 요청한 자리에 안 들어가면(misplaced) 만든 칸을 지우고 이유와 복원 여부를 kind 를 video-unconfirmed 로 해 알린다. 올라간 영상은 성공해도 실패해도 블로그 영상 보관함에 남을 수 있다. 같은 호출을 되풀이하면 영상이 두 번 들어간다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `fileName` | 문자열 | O | 영상 파일 이름 (예: 소개.mp4). 경로 구분 문자는 안 된다. |
| `contentBase64` | 문자열 | O | 영상 내용을 base64 로 인코딩한 문자열 (원본 2MB 이하). |
| `mimeType` | 문자열 | X | 영상의 미디어 형식 (예: video/mp4). 모르면 비운다. |
| `componentId` | 문자열 | O | 영상을 놓을 기준 컴포넌트 id (editor_read_document). |
| `position` | 문자열 | X | 기준 컴포넌트의 앞(before)이나 뒤(after). 기본 after. |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`
- [문단 서식 적용](/tools/editor-detail/editor_set_paragraph_styles/) `editor_set_paragraph_styles`
- [간격 맞추기](/tools/editor-detail/editor_apply_layout/) `editor_apply_layout`
- [이미지 배치](/tools/editor-detail/editor_set_image_layout/) `editor_set_image_layout`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
