---
layout: "dl-tool"
title: "영상 편집기 — 내보내기 진행 확인"
description: "video_export 나 video_source_add 가 시작한 job 의 진행률을 확인한다. 내보내기가 끝났으면 결과 파일 이름·크기·sha256 도 준다. 내보내기 job 은 시작할 때 저장한 manifest 와, 끝난 뒤 encoded(인코더에 넘긴 프레임 수·길이·코덱)를 함께 준다. 다시 물어도 저장된 기록을 그대로 돌려줄 뿐 다시 인코딩하거나 다시 재지 않는다. evidence.measured 는 실제로 잰 것, evidence.notMeasured 는 재지 않은 것(코덱 검사·전체 디코드·미리보기·재생)이다."
nav: "tools"
tool: "video_job_status"
generated: true
---

# 영상 편집기 — 내보내기 진행 확인

`video_job_status` · 바로 조회 · 내 컴퓨터

video_export 나 video_source_add 가 시작한 job 의 진행률을 확인한다. 내보내기가 끝났으면 결과 파일 이름·크기·sha256 도 준다. 내보내기 job 은 시작할 때 저장한 manifest 와, 끝난 뒤 encoded(인코더에 넘긴 프레임 수·길이·코덱)를 함께 준다. 다시 물어도 저장된 기록을 그대로 돌려줄 뿐 다시 인코딩하거나 다시 재지 않는다. evidence.measured 는 실제로 잰 것, evidence.notMeasured 는 재지 않은 것(코덱 검사·전체 디코드·미리보기·재생)이다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `job` | 문자열 | O | video_export 또는 video_source_add 가 준 job |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — 파일로 내보내기](/tools/video-editor/video_export/) `video_export`
- [영상 편집기 — 영상 · 음악 파일 넣기](/tools/video-editor/video_source_add/) `video_source_add`
- [영상 편집기 — 현재 프로젝트 확인](/tools/video-editor/video_project_get/) `video_project_get`
- [영상 편집기 — 새 프로젝트 만들기](/tools/video-editor/video_project_new/) `video_project_new`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
