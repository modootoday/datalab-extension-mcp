---
layout: "dl-tool"
title: "편집 화면 찍기"
description: "글쓰기 창의 실제 편집 화면을 사진으로 찍어 이미지로 돌려준다. 탭을 앞으로 가져온 뒤 지금 보이는 화면을 찍는다. componentId 를 주면 그 컴포넌트를 화면 가운데로 스크롤한 뒤 그 부분만 잘라 준다. 응답에는 editorSession, revision, 화면 크기(viewport), 컴포넌트 위치(rect), 마지막 임시저장과 같은 내용인지(draftSaved)가 들어 있다. 찍는 것은 편집 화면이고 발행된 글 화면이 아니다. 글 전체를 한 장으로 이어 붙이지는 않으니 긴 글은 componentId 로 나눠 부른다. 화면 너비는 사용자의 창 그대로라서 바꾸지 않는다. viewportWidth 를 주면 실제 너비와 맞는지만 확인하고, 다르면 찍지 않고 실제 너비를 알려 준다. 글쓰기 창이 하나일 때만 동작한다. 설치된 확장 프로그램이 화면을 찍지 못하면 페이지 내용으로 편집 화면을 다시 그려 돌려준다(method: dom-render). 이 그림은 실제 스크린샷이 아니라서 글꼴, 동영상·지도 같은 삽입물, 일부 이미지가 실제 화면과 다를 수 있고, 불러오지 못한 이미지는 회색 상자로 그린다. 인자 없이({}) 불러도 된다. 결과의 diagnostics 에는 method, 그린 시간(renderMs), 회색 상자 수(placeholders: offscreen 화면 밖이라 안 가져옴, fetchFailed 가져오기 실패, noBridge 가져올 통로 없음), 배포된 파일 이름의 해시(loaderAssetHash, panelAssetHash, git 커밋이 아님)가 있다. 해시를 읽지 못하면 그 대신 이유(loaderAssetHashUnavailable, panelAssetHashUnavailable: unhashed-name 은 파일 이름에 해시가 없음, not-reported 는 이 값을 알려 주기 전의 로더)가 붙는다. 다시 그리기도 실패하면 stage 로 멈춘 단계를 알려 준다: no-matching-tab, no-controller(창은 있지만 편집기가 답하지 않음), loader-predates-op(창이 예전 로더라 새로고침 필요), relay-timeout, relay-failed, 또는 페이지 안 단계(editor-not-found, not-visible, component-missing, timeout, render-failed)."
nav: "tools"
tool: "editor_capture_document"
generated: true
---

# 편집 화면 찍기

`editor_capture_document` · 매번 물어봄 · 내 컴퓨터

글쓰기 창의 실제 편집 화면을 사진으로 찍어 이미지로 돌려준다. 탭을 앞으로 가져온 뒤 지금 보이는 화면을 찍는다. componentId 를 주면 그 컴포넌트를 화면 가운데로 스크롤한 뒤 그 부분만 잘라 준다. 응답에는 editorSession, revision, 화면 크기(viewport), 컴포넌트 위치(rect), 마지막 임시저장과 같은 내용인지(draftSaved)가 들어 있다. 찍는 것은 편집 화면이고 발행된 글 화면이 아니다. 글 전체를 한 장으로 이어 붙이지는 않으니 긴 글은 componentId 로 나눠 부른다. 화면 너비는 사용자의 창 그대로라서 바꾸지 않는다. viewportWidth 를 주면 실제 너비와 맞는지만 확인하고, 다르면 찍지 않고 실제 너비를 알려 준다. 글쓰기 창이 하나일 때만 동작한다. 설치된 확장 프로그램이 화면을 찍지 못하면 페이지 내용으로 편집 화면을 다시 그려 돌려준다(method: dom-render). 이 그림은 실제 스크린샷이 아니라서 글꼴, 동영상·지도 같은 삽입물, 일부 이미지가 실제 화면과 다를 수 있고, 불러오지 못한 이미지는 회색 상자로 그린다. 인자 없이({}) 불러도 된다. 결과의 diagnostics 에는 method, 그린 시간(renderMs), 회색 상자 수(placeholders: offscreen 화면 밖이라 안 가져옴, fetchFailed 가져오기 실패, noBridge 가져올 통로 없음), 배포된 파일 이름의 해시(loaderAssetHash, panelAssetHash, git 커밋이 아님)가 있다. 해시를 읽지 못하면 그 대신 이유(loaderAssetHashUnavailable, panelAssetHashUnavailable: unhashed-name 은 파일 이름에 해시가 없음, not-reported 는 이 값을 알려 주기 전의 로더)가 붙는다. 다시 그리기도 실패하면 stage 로 멈춘 단계를 알려 준다: no-matching-tab, no-controller(창은 있지만 편집기가 답하지 않음), loader-predates-op(창이 예전 로더라 새로고침 필요), relay-timeout, relay-failed, 또는 페이지 안 단계(editor-not-found, not-visible, component-missing, timeout, render-failed).

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
