---
layout: "dl-tool"
title: "편집 화면 찍기"
description: "글쓰기 창의 편집 화면을 찍어 이미지로 돌려주며, 탭을 앞으로 가져온 뒤 지금 보이는 화면을 찍는다. 찍는 것은 편집 화면이지 발행된 글이 아니고, 글 전체를 한 장으로 잇지 않아 긴 글은 componentId 로 그 컴포넌트를 가운데로 스크롤해 나눠 찍는다. 글쓰기 창이 하나일 때만 동작하고 인자 없이 불러도 된다. 화면 너비는 바꾸지 않으며 viewportWidth 가 실제 너비와 다르면 찍지 않고 실제 너비를 알려 준다. method 가 dom-render 면 실제 스크린샷이 아니라 페이지 내용으로 다시 그린 그림이라 글꼴·삽입물·일부 이미지가 다를 수 있고, 불러오지 못한 이미지는 회색 상자다. diagnostics 의 파일 해시는 git 커밋이 아니다. 실패하면 stage 가 멈춘 단계이고, loader-predates-op 면 창을 새로고침해야 한다."
nav: "tools"
tool: "editor_capture_document"
generated: true
---

# 편집 화면 찍기

`editor_capture_document` · 매번 물어봄 · 내 컴퓨터

글쓰기 창의 편집 화면을 찍어 이미지로 돌려주며, 탭을 앞으로 가져온 뒤 지금 보이는 화면을 찍는다. 찍는 것은 편집 화면이지 발행된 글이 아니고, 글 전체를 한 장으로 잇지 않아 긴 글은 componentId 로 그 컴포넌트를 가운데로 스크롤해 나눠 찍는다. 글쓰기 창이 하나일 때만 동작하고 인자 없이 불러도 된다. 화면 너비는 바꾸지 않으며 viewportWidth 가 실제 너비와 다르면 찍지 않고 실제 너비를 알려 준다. method 가 dom-render 면 실제 스크린샷이 아니라 페이지 내용으로 다시 그린 그림이라 글꼴·삽입물·일부 이미지가 다를 수 있고, 불러오지 못한 이미지는 회색 상자다. diagnostics 의 파일 해시는 git 커밋이 아니다. 실패하면 stage 가 멈춘 단계이고, loader-predates-op 면 창을 새로고침해야 한다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `componentId` | 문자열 | X | 선택. 잘라 낼 컴포넌트 id (editor_read_document). 없으면 지금 보이는 화면 전체. |
| `viewportWidth` | 정수 | X | 선택. 기대하는 화면 너비(px). 실제 너비와 맞지 않으면 찍지 않는다. |

## 함께 쓰는 도구

- [컴포넌트 고치기](/tools/editor-detail/editor_update_component/) `editor_update_component`
- [문단 서식 적용](/tools/editor-detail/editor_set_paragraph_styles/) `editor_set_paragraph_styles`
- [간격 맞추기](/tools/editor-detail/editor_apply_layout/) `editor_apply_layout`
- [이미지 배치](/tools/editor-detail/editor_set_image_layout/) `editor_set_image_layout`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
