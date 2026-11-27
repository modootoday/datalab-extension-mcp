---
layout: "dl-tool"
title: "사진 편집기 — 갤러리 사진 넣기"
description: "갤러리 이미지를 캔버스에 추가한다. frame_ref 를 주면 그 빈 프레임에 채워 넣는다. 원본 비율은 늘 지킨다(늘리지 않는다). box 와 fit 으로 넣을 자리와 맞춤 방식을 정한다. 응답의 placement 에 intrinsicSize, fit, 실제로 쓴 applied, crop(0~1), renderedBounds(페이지 px), coverage, subjectBounds 가 실린다."
nav: "tools"
tool: "photo_image_add_from_gallery"
generated: true
---

# 사진 편집기 — 갤러리 사진 넣기

`photo_image_add_from_gallery` · 매번 물어봄 · 내 컴퓨터

갤러리 이미지를 캔버스에 추가한다. frame_ref 를 주면 그 빈 프레임에 채워 넣는다. 원본 비율은 늘 지킨다(늘리지 않는다). box 와 fit 으로 넣을 자리와 맞춤 방식을 정한다. 응답의 placement 에 intrinsicSize, fit, 실제로 쓴 applied, crop(0~1), renderedBounds(페이지 px), coverage, subjectBounds 가 실린다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `gallery_ref` | 문자열 | O | photo_gallery_list 가 준 항목 ref |
| `frame_ref` | 문자열 | X | 채워 넣을 빈 프레임 ref(생략 시 새 이미지로 삽입). 주면 그 프레임 자리가 box 다 |
| `box` | 객체 | X | 이미지를 맞출 자리(페이지 px). 생략 시 페이지 가운데 80% 영역에 contain |
| `fit` | 문자열 | X | contain=전체가 보이게 box 안에 넣는다(남는 곳은 빈다), cover=box 를 채우고 넘치는 부분을 자른다, subject-safe=subject 영역이 다 보이는 한에서 최대한 채운다(안 되면 넓혀서, 끝내 contain). 생략 시 box 는 contain, frame_ref 는 cover |
| `anchor` | 문자열 | X | 자를 때 남길 쪽, 남는 공간이 있을 때 붙일 쪽. 생략 시 center(subject-safe 는 subject 를 가운데로) |
| `subject` | 객체 | X | subject-safe 에서 꼭 보여야 할 영역. 원본(EXIF 방향 적용) 기준 0~1 비율. 편집기가 찾지 않으므로 호출자가 준다 |
| `page` | 문자열 | X | 이미지를 넣을 페이지 ref(예: 'p-c4d8'). 생략 시 활성 페이지 |
| `editor_session` | 문자열 | X | photo_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [사진 편집기 — 현재 프로젝트 확인](/tools/photo-editor/photo_project_get/) `photo_project_get`
- [사진 편집기 — 새 프로젝트 만들기](/tools/photo-editor/photo_project_new/) `photo_project_new`
- [사진 편집기 — 저장된 프로젝트 목록](/tools/photo-editor/photo_project_list/) `photo_project_list`
- [사진 편집기 — 저장된 프로젝트 열기](/tools/photo-editor/photo_project_open/) `photo_project_open`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
