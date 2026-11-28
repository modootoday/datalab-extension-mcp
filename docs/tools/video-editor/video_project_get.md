---
layout: "dl-tool"
title: "영상 편집기 — 현재 프로젝트 확인"
description: "현재 영상 편집기 세션과 프로젝트, 저장 상태를 확인한다. 편집을 시작하거나 이어가기 전에 먼저 호출한다. documentHash 는 저장되는 문서 내용(선택·보기 상태·세션 제외, 이름 제외)의 sha256 이라 새로고침·재연결 뒤에도 내용이 같으면 같다. persistedRevision 은 프로젝트와 함께 저장되는 저장 횟수(저장한 적 없으면 0), savedHash 는 마지막 저장 때의 documentHash(저장한 적 없으면 null)다. dirty 는 마지막 저장 뒤(저장한 적 없으면 만들거나 연 뒤) 사용자가 내용을 바꿨는지 하나만 뜻하고, saving 은 지금 저장 중인지다. editorSession 과 revision(runtimeRevision)은 페이지를 열 때마다 새로 시작하므로, 같은 문서인지는 projectRef 와 documentHash 로 판단하고 모르는 문서를 이어받지 않는다. 같은 값이 모든 응답의 editor 에도 실린다."
nav: "tools"
tool: "video_project_get"
generated: true
---

# 영상 편집기 — 현재 프로젝트 확인

`video_project_get` · 바로 조회 · 내 컴퓨터

현재 영상 편집기 세션과 프로젝트, 저장 상태를 확인한다. 편집을 시작하거나 이어가기 전에 먼저 호출한다. documentHash 는 저장되는 문서 내용(선택·보기 상태·세션 제외, 이름 제외)의 sha256 이라 새로고침·재연결 뒤에도 내용이 같으면 같다. persistedRevision 은 프로젝트와 함께 저장되는 저장 횟수(저장한 적 없으면 0), savedHash 는 마지막 저장 때의 documentHash(저장한 적 없으면 null)다. dirty 는 마지막 저장 뒤(저장한 적 없으면 만들거나 연 뒤) 사용자가 내용을 바꿨는지 하나만 뜻하고, saving 은 지금 저장 중인지다. editorSession 과 revision(runtimeRevision)은 페이지를 열 때마다 새로 시작하므로, 같은 문서인지는 projectRef 와 documentHash 로 판단하고 모르는 문서를 이어받지 않는다. 같은 값이 모든 응답의 editor 에도 실린다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — 새 프로젝트 만들기](/tools/video-editor/video_project_new/) `video_project_new`
- [영상 편집기 — 저장된 프로젝트 목록](/tools/video-editor/video_project_list/) `video_project_list`
- [영상 편집기 — 저장된 프로젝트 열기](/tools/video-editor/video_project_open/) `video_project_open`
- [영상 편집기 — 프로젝트 이름 바꾸기](/tools/video-editor/video_project_rename/) `video_project_rename`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
