---
layout: "dl-tool"
title: "사진 편집기 — 스티커 넣기"
description: "기본 스티커(별·하트·화살표·왕관 등)를 추가한다. 장식 포인트에 쓴다. 크기를 생략하면 원래 비율 그대로 캔버스 짧은 변의 35% 안(원본보다 크게 키우지 않음)에 맞추고, width 나 height 하나만 주면 나머지는 원래 비율로 정한다. 둘 다 주면 그 상자에 맞춰 늘려 그리므로 비율이 다르면 그림이 찌그러진다."
nav: "tools"
tool: "photo_sticker_add"
generated: true
---

# 사진 편집기 — 스티커 넣기

`photo_sticker_add` · 매번 물어봄 · 내 컴퓨터

기본 스티커(별·하트·화살표·왕관 등)를 추가한다. 장식 포인트에 쓴다. 크기를 생략하면 원래 비율 그대로 캔버스 짧은 변의 35% 안(원본보다 크게 키우지 않음)에 맞추고, width 나 height 하나만 주면 나머지는 원래 비율로 정한다. 둘 다 주면 그 상자에 맞춰 늘려 그리므로 비율이 다르면 그림이 찌그러진다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `sticker` | 문자열 | O | 추가할 스티커 종류 |
| `width` | 숫자 | X | 스티커 가로 크기(px) |
| `height` | 숫자 | X | 스티커 세로 크기(px) |
| `position` | 문자열 | X | 캔버스 내 배치 위치(예: 'top-center', 'center'). x/y 대신 쓰며, position 이 우선한다 |
| `x` | 숫자 | X | 좌상단 x(px). position 이 없을 때만 |
| `y` | 숫자 | X | 좌상단 y(px). position 이 없을 때만 |
| `page` | 문자열 | X | 대상 페이지 ref(예: 'p-c4d8'). 생략 시 활성 페이지 |
| `editor_session` | 문자열 | X | photo_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [사진 편집기 — 현재 프로젝트 확인](/tools/photo-editor/photo_project_get/) `photo_project_get`
- [사진 편집기 — 새 프로젝트 만들기](/tools/photo-editor/photo_project_new/) `photo_project_new`
- [사진 편집기 — 저장된 프로젝트 목록](/tools/photo-editor/photo_project_list/) `photo_project_list`
- [사진 편집기 — 저장된 프로젝트 열기](/tools/photo-editor/photo_project_open/) `photo_project_open`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
