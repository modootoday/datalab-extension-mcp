---
layout: "dl-tool"
title: "사진 편집기 — 갤러리 이미지 목록"
description: "확장 갤러리에 저장된 이미지 목록을 가져온다(사용자가 예전에 만든 이미지). photo_image_add_from_gallery 로 삽입할 때의 gallery_ref 를 얻는다. 항목마다 asset(파일 바이트로 확인한 sha256·format·bytes, EXIF 방향을 적용한 intrinsicWidth·intrinsicHeight·orientation)과 origin, 알 때만 disclosure 를 준다. origin 이 generated 면 확장이 AI 로 만든 것, upload 면 gallery_image_add 로 들어온 것, unknown 이면 기록 전 항목이다. 같은 바이트의 다른 항목은 duplicateOf 로 알리고 합치지 않는다. caller 는 넣은 쪽이 말한 값(role, aiGenerated, derivedFrom)이고 확인된 사실이 아니다. lineage 는 derivedFrom 을 부모 바이트와 대조한 결과다."
nav: "tools"
tool: "photo_gallery_list"
generated: true
---

# 사진 편집기 — 갤러리 이미지 목록

`photo_gallery_list` · 바로 조회 · 내 컴퓨터

확장 갤러리에 저장된 이미지 목록을 가져온다(사용자가 예전에 만든 이미지). photo_image_add_from_gallery 로 삽입할 때의 gallery_ref 를 얻는다. 항목마다 asset(파일 바이트로 확인한 sha256·format·bytes, EXIF 방향을 적용한 intrinsicWidth·intrinsicHeight·orientation)과 origin, 알 때만 disclosure 를 준다. origin 이 generated 면 확장이 AI 로 만든 것, upload 면 gallery_image_add 로 들어온 것, unknown 이면 기록 전 항목이다. 같은 바이트의 다른 항목은 duplicateOf 로 알리고 합치지 않는다. caller 는 넣은 쪽이 말한 값(role, aiGenerated, derivedFrom)이고 확인된 사실이 아니다. lineage 는 derivedFrom 을 부모 바이트와 대조한 결과다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `limit` | 정수 | X | 가져올 최대 개수(1~24). 생략 시 24 |
| `editor_session` | 문자열 | X | photo_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [사진 편집기 — 갤러리 사진 넣기](/tools/photo-editor/photo_image_add_from_gallery/) `photo_image_add_from_gallery`
- [갤러리 — 내 컴퓨터 사진 넣기](/tools/gallery/gallery_image_add/) `gallery_image_add`
- [사진 편집기 — 현재 프로젝트 확인](/tools/photo-editor/photo_project_get/) `photo_project_get`
- [사진 편집기 — 새 프로젝트 만들기](/tools/photo-editor/photo_project_new/) `photo_project_new`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
