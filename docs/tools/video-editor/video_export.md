---
layout: "dl-tool"
title: "영상 편집기 — 파일로 내보내기"
description: "영상을 파일로 인코딩하는 작업을 시작하고 job 을 바로 돌려준다. 몇 분 걸릴 수 있다. video_job_status 로 진행률을 보고, 끝나면 gallery_export_save 로 파일을 받는다. 브라우저가 AAC 를 못 넣으면 영상과 소리가 두 파일로 나온다. 응답의 manifest 는 이 job 이 그리는 입력의 증거다: projectId·revision, 렌더 입력 전체의 inputDigest(sha256), renderer 버전, fps, 예상 frameCount·durationMs. 응답을 놓쳤으면 같은 operation_id 로 다시 부른다 — 새로 인코딩하지 않고 그때 시작한 job 을 돌려준다(replayed true)."
nav: "tools"
tool: "video_export"
generated: true
---

# 영상 편집기 — 파일로 내보내기

`video_export` · 바로 조회 · 내 컴퓨터

영상을 파일로 인코딩하는 작업을 시작하고 job 을 바로 돌려준다. 몇 분 걸릴 수 있다. video_job_status 로 진행률을 보고, 끝나면 gallery_export_save 로 파일을 받는다. 브라우저가 AAC 를 못 넣으면 영상과 소리가 두 파일로 나온다. 응답의 manifest 는 이 job 이 그리는 입력의 증거다: projectId·revision, 렌더 입력 전체의 inputDigest(sha256), renderer 버전, fps, 예상 frameCount·durationMs. 응답을 놓쳤으면 같은 operation_id 로 다시 부른다 — 새로 인코딩하지 않고 그때 시작한 job 을 돌려준다(replayed true).

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `format` | 문자열 | X | 파일 형식. 생략 시 mp4 |
| `scale` | 숫자 | X | 캔버스 대비 크기. 생략 시 1. 짧은 변은 2160px 를 넘지 않게 줄인다 |
| `quality` | 문자열 | X | 화질(비트레이트). 생략 시 high |
| `start_sec` | 숫자 | X | 이 시점부터만 내보낸다(초) |
| `end_sec` | 숫자 | X | 이 시점까지만 내보낸다(초) |
| `operation_id` | 문자열 | X | 호출자가 정한 작업 id. 같은 값과 같은 설정으로 다시 부르면 처음 시작한 job 을 돌려주고, 설정이 다르면 거부한다. 편집기 탭을 새로 열면 잊는다 |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — 내보내기 진행 확인](/tools/video-editor/video_job_status/) `video_job_status`
- [편집기 결과 파일 저장](/tools/gallery/gallery_export_save/) `gallery_export_save`
- [영상 편집기 — 현재 프로젝트 확인](/tools/video-editor/video_project_get/) `video_project_get`
- [영상 편집기 — 새 프로젝트 만들기](/tools/video-editor/video_project_new/) `video_project_new`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
