---
layout: "dl-tool"
title: "파일 붙이기"
description: "글쓰기 창 본문의 한 컴포넌트 앞이나 뒤에 파일 하나를 첨부한다. 파일 이름(fileName)과 내용(contentBase64, base64 문자열, 2MB 이하)을 주면 에디터의 파일 업로드로 블로그에 올리고 첨부 칸을 만든다. 기준 컴포넌트는 editor_read_document 의 id(componentId)로 고르며 position 은 after(기본)나 before 다. 블로그가 받지 않는 형식이거나 올리지 못했거나(upload-failed), 올라갔어도 글에 붙지 않았거나(not-attached), 요청한 자리에 안 들어가면(misplaced) 만든 칸을 지우고 이유와 복원 여부를 kind: file-unconfirmed 로 알린다. 올라간 파일은 블로그 저장소에 남을 수 있다. 같은 호출을 되풀이하면 파일이 두 번 붙는다."
nav: "tools"
tool: "editor_insert_file"
generated: true
---

# 파일 붙이기

`editor_insert_file` · 매번 물어봄 · 내 컴퓨터

글쓰기 창 본문의 한 컴포넌트 앞이나 뒤에 파일 하나를 첨부한다. 파일 이름(fileName)과 내용(contentBase64, base64 문자열, 2MB 이하)을 주면 에디터의 파일 업로드로 블로그에 올리고 첨부 칸을 만든다. 기준 컴포넌트는 editor_read_document 의 id(componentId)로 고르며 position 은 after(기본)나 before 다. 블로그가 받지 않는 형식이거나 올리지 못했거나(upload-failed), 올라갔어도 글에 붙지 않았거나(not-attached), 요청한 자리에 안 들어가면(misplaced) 만든 칸을 지우고 이유와 복원 여부를 kind: file-unconfirmed 로 알린다. 올라간 파일은 블로그 저장소에 남을 수 있다. 같은 호출을 되풀이하면 파일이 두 번 붙는다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `fileName` | 문자열 | O | 첨부될 파일 이름 (예: 자막.srt). 경로 구분 문자는 안 된다. |
| `contentBase64` | 문자열 | O | 파일 내용을 base64 로 인코딩한 문자열 (원본 2MB 이하). |
| `mimeType` | 문자열 | X | 파일의 미디어 형식 (예: text/plain). 모르면 비운다. |
| `componentId` | 문자열 | O | 파일을 놓을 기준 컴포넌트 id (editor_read_document). |
| `position` | 문자열 | X | 기준 컴포넌트의 앞(before)이나 뒤(after). 기본 after. |
| `target` | 객체 | X | 선택. 쓰기 전에 확인할 대상. editor_read_document 가 돌려준 editorSession 을 주면 다른 글쓰기 창이면 쓰지 않고 stale-target 으로 멈춘다. expectedRevision 을 주면 그 뒤로 글이 바뀌었을 때 멈춘다. |
| `operationId` | 문자열 | X | 선택. 이 작업의 고유 ID. 같은 ID 로 다시 보내면 중복 실행하지 않고 처음 결과를 돌려준다. 응답이 끊기면 editor_operation_status 로 적용 여부를 확인한다. |

## 함께 쓰는 도구

- [문서 전체 읽기](/tools/editor-control/editor_read_document/) `editor_read_document`
- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`
- [문단 서식 적용](/tools/editor-detail/editor_set_paragraph_styles/) `editor_set_paragraph_styles`
- [간격 맞추기](/tools/editor-detail/editor_apply_layout/) `editor_apply_layout`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
