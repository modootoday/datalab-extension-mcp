---
layout: "dl-tool"
title: "사진 편집기 — 캔버스 확인"
description: "현재 캔버스 구성을 확인한다(페이지 목록 + 활성 페이지의 모든 요소를 ref·종류·위치·크기와 함께). 편집 전 항상 먼저 호출해 요소 ref 를 파악한다. measure: true 를 주면 글자 요소마다 렌더러가 실제로 줄바꿈한 줄·실제 글꼴·그려지는 영역·겹치는 요소 ref 를 page.measure 에 함께 준다. 사진 요소는 page.images 에 ref 별로 sourceAssetId·sha256(갤러리에서 넣은 사진만), intrinsicSize, fit·anchor(넣을 때 값), crop(0~1), renderedBounds(페이지 px), aspectPreserved, onPage 와 지금 보이는 모습 look(filter 프리셋 id, adjust 는 0 이 아닌 항목만, grade 는 저장된 레벨·커브·hsl·key 와 lut{ref,name,strength})을 준다. look 의 null 은 설정하지 않았다는 뜻이다. subject 를 주고 넣은 사진은 subjectBounds 와, measure 일 때 그 영역을 가리는 글자 ref(textOverSubject)도 준다. canvasPreset 은 보는 페이지 크기와 같은 크기 프리셋의 id 와 safeAreas(id·label·rect{x,y,w,h}, 캔버스 대비 0~1 비율)이고 같은 프리셋이 없으면 null 이다. safeAreas 는 문서에 저장되지 않고 내보내기에도 나오지 않는 안내 영역이며, 요소가 그 안에 있는지 판정하지는 않는다."
nav: "tools"
tool: "photo_canvas_get"
generated: true
---

# 사진 편집기 — 캔버스 확인

`photo_canvas_get` · 바로 조회 · 내 컴퓨터

현재 캔버스 구성을 확인한다(페이지 목록 + 활성 페이지의 모든 요소를 ref·종류·위치·크기와 함께). 편집 전 항상 먼저 호출해 요소 ref 를 파악한다. measure: true 를 주면 글자 요소마다 렌더러가 실제로 줄바꿈한 줄·실제 글꼴·그려지는 영역·겹치는 요소 ref 를 page.measure 에 함께 준다. 사진 요소는 page.images 에 ref 별로 sourceAssetId·sha256(갤러리에서 넣은 사진만), intrinsicSize, fit·anchor(넣을 때 값), crop(0~1), renderedBounds(페이지 px), aspectPreserved, onPage 와 지금 보이는 모습 look(filter 프리셋 id, adjust 는 0 이 아닌 항목만, grade 는 저장된 레벨·커브·hsl·key 와 lut{ref,name,strength})을 준다. look 의 null 은 설정하지 않았다는 뜻이다. subject 를 주고 넣은 사진은 subjectBounds 와, measure 일 때 그 영역을 가리는 글자 ref(textOverSubject)도 준다. canvasPreset 은 보는 페이지 크기와 같은 크기 프리셋의 id 와 safeAreas(id·label·rect{x,y,w,h}, 캔버스 대비 0~1 비율)이고 같은 프리셋이 없으면 null 이다. safeAreas 는 문서에 저장되지 않고 내보내기에도 나오지 않는 안내 영역이며, 요소가 그 안에 있는지 판정하지는 않는다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `page` | 문자열 | X | 볼 페이지 ref. 생략 시 활성 페이지 |
| `measure` | 참/거짓 | X | true 면 글자 배치를 렌더러로 재서 page.measure(ref 별 wrappedLines·lineCount·lineHeight·renderedBounds·overflow·overlaps·actualFont·fontsReady·fallbackGlyphs)를 붙인다. actualFont 는 캔버스가 실제로 그리는 글꼴로, 요청한 글꼴이 글자 일부라도 그리면 그 이름이고 하나도 못 그리면 대체 글꼴(browser-default 등)이다. fallbackGlyphs 는 요청한 글꼴에 없어 다른 글꼴로 그려지는 글자 목록(이모지·드문 한자 등, 빈 배열이면 모두 요청한 글꼴), null 이면 판별하지 못한 것이다. 글꼴 로딩을 기다려 느리므로 배치 확인이 필요할 때만 |
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
