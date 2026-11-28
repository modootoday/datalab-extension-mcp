---
layout: "dl-tool"
title: "영상 편집기 — 갤러리 사진 넣기"
description: "확장 갤러리에 있는 사진을 이 영상으로 가져와 장면에 넣는다. photo_gallery_list 가 준 ref 를 쓴다. 배경으로 넣으면 그 장면의 배경 사진이 바뀌고, 위에 얹으면 로고처럼 장면 위에 겹친다. 갤러리에 없는 사진은 gallery_image_add 로 먼저 넣는다."
nav: "tools"
tool: "video_image_add_from_gallery"
generated: true
---

# 영상 편집기 — 갤러리 사진 넣기

`video_image_add_from_gallery` · 매번 물어봄 · 내 컴퓨터

확장 갤러리에 있는 사진을 이 영상으로 가져와 장면에 넣는다. photo_gallery_list 가 준 ref 를 쓴다. 배경으로 넣으면 그 장면의 배경 사진이 바뀌고, 위에 얹으면 로고처럼 장면 위에 겹친다. 갤러리에 없는 사진은 gallery_image_add 로 먼저 넣는다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `scene` | 문자열 | O | video_timeline_get 이 준 장면 ref |
| `gallery_ref` | 문자열 | O | photo_gallery_list 가 준 항목 ref |
| `as` | 문자열 | X | 배경 사진으로 바꿀지(background), 장면 위에 얹을지(overlay). 기본값 background |
| `width` | 숫자 | X | overlay 일 때 가로 크기(px). 생략하면 원본 비율대로 |
| `position` | 문자열 | X | 화면 안 위치(생략 시 가운데). x/y 보다 우선한다 |
| `x` | 숫자 | X | 왼쪽 위 x(px). position 이 있으면 무시 |
| `y` | 숫자 | X | 왼쪽 위 y(px). position 이 있으면 무시 |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [사진 편집기 — 갤러리 이미지 목록](/tools/photo-editor/photo_gallery_list/) `photo_gallery_list`
- [갤러리 — 내 컴퓨터 사진 넣기](/tools/gallery/gallery_image_add/) `gallery_image_add`
- [영상 편집기 — 현재 프로젝트 확인](/tools/video-editor/video_project_get/) `video_project_get`
- [영상 편집기 — 새 프로젝트 만들기](/tools/video-editor/video_project_new/) `video_project_new`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
