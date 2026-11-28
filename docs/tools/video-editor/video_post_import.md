---
layout: "dl-tool"
title: "영상 편집기 — 게시물 가져오기"
description: "네이버 블로그·카페·인플루언서 게시물 주소를 읽어 사진과 문단으로 장면을 만든다. targetSec 를 주면 그 길이에 맞게 중요한 장면만 남긴다. 사용자의 확장으로 읽으며 확장이 없으면 실패한다. 되돌리기 한 번으로 취소된다."
nav: "tools"
tool: "video_post_import"
generated: true
---

# 영상 편집기 — 게시물 가져오기

`video_post_import` · 매번 물어봄 · 내 컴퓨터

네이버 블로그·카페·인플루언서 게시물 주소를 읽어 사진과 문단으로 장면을 만든다. targetSec 를 주면 그 길이에 맞게 중요한 장면만 남긴다. 사용자의 확장으로 읽으며 확장이 없으면 실패한다. 되돌리기 한 번으로 취소된다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `url` | 문자열 | O | 게시물 주소 |
| `targetSec` | 숫자 | X | 목표 길이(초). 없으면 모든 장면 |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — 현재 프로젝트 확인](/tools/video-editor/video_project_get/) `video_project_get`
- [영상 편집기 — 새 프로젝트 만들기](/tools/video-editor/video_project_new/) `video_project_new`
- [영상 편집기 — 저장된 프로젝트 목록](/tools/video-editor/video_project_list/) `video_project_list`
- [영상 편집기 — 저장된 프로젝트 열기](/tools/video-editor/video_project_open/) `video_project_open`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
