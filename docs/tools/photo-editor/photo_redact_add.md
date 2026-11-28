---
layout: "dl-tool"
title: "사진 편집기 — 모자이크·흐림으로 가리기"
description: "얼굴·번호판처럼 가릴 곳에 모자이크나 흐림 영역을 얹는다. 영역은 그 아래에 그려진 사진과 요소를 모두 가리고 내보내기에도 같게 나온다. 결과 ref 는 r- 로 시작하고, 위치·크기·mode·strength 는 photo_node_update 로 바꾸며 photo_canvas_get 에서 확인한다. 가림 영역은 도형으로 자르지 않고, 있는 페이지는 SVG 로 내보내지 않는다."
nav: "tools"
tool: "photo_redact_add"
generated: true
---

# 사진 편집기 — 모자이크·흐림으로 가리기

`photo_redact_add` · 매번 물어봄 · 내 컴퓨터

얼굴·번호판처럼 가릴 곳에 모자이크나 흐림 영역을 얹는다. 영역은 그 아래에 그려진 사진과 요소를 모두 가리고 내보내기에도 같게 나온다. 결과 ref 는 r- 로 시작하고, 위치·크기·mode·strength 는 photo_node_update 로 바꾸며 photo_canvas_get 에서 확인한다. 가림 영역은 도형으로 자르지 않고, 있는 페이지는 SVG 로 내보내지 않는다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `x` | 숫자 | O | 영역 왼쪽 위 x(페이지 px) |
| `y` | 숫자 | O | 영역 왼쪽 위 y(페이지 px) |
| `width` | 숫자 | O | 영역 가로 크기(px) |
| `height` | 숫자 | O | 영역 세로 크기(px) |
| `mode` | 문자열 | X | mosaic=네모 칸으로 뭉갬, blur=흐리게. 생략 시 mosaic |
| `strength` | 숫자 | X | 세기, 캔버스 짧은 변 대비 비율. mosaic 은 칸 크기 0.01~0.08(기본 0.03), blur 는 흐림 반경 0.005~0.05(기본 0.02). 생략 시 mode 의 기본값 |
| `page` | 문자열 | X | 대상 페이지 ref(예: 'p-c4d8'). 생략 시 활성 페이지 |
| `editor_session` | 문자열 | X | photo_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [사진 편집기 — 요소 고치기](/tools/photo-editor/photo_node_update/) `photo_node_update`
- [사진 편집기 — 캔버스 확인](/tools/photo-editor/photo_canvas_get/) `photo_canvas_get`
- [사진 편집기 — 현재 프로젝트 확인](/tools/photo-editor/photo_project_get/) `photo_project_get`
- [사진 편집기 — 새 프로젝트 만들기](/tools/photo-editor/photo_project_new/) `photo_project_new`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
