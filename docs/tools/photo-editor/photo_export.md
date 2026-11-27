---
layout: "dl-tool"
title: "사진 편집기 — 파일로 내보내기"
description: "현재 디자인을 이미지 파일로 내보내는 작업을 시작하고 job 을 돌려준다. 여러 페이지는 zip 하나로 묶고, pdf 는 페이지마다 한 쪽인 PDF 한 파일로 만든다. svg 는 활성 페이지 한 장만 — 글자·도형은 벡터, 사진은 PNG 로 담는다. 인쇄용이면 dpi 를 준다. 오래 걸리면 state running 인 job 을 먼저 돌려준다. photo_job_status 로 끝났는지 확인한 뒤 gallery_export_save 로 파일을 받는다. 응답을 놓쳤으면 같은 operation_id 로 다시 부른다 — 새로 내보내지 않고 그때 시작한 job 을 돌려준다(replayed true). 그리기 전에 글자에 쓴 글꼴을 정해진 시간 안에서 불러오고(기다리는 시간은 늘지 않는다), 응답과 photo_job_status 의 fonts 에 그 결과를 싣는다: faces 는 글꼴(family·weight·style)마다 캔버스가 그 글꼴로 그렸는지(drawn), 실제로 그린 글꼴(actualFont), 그 글꼴에 없어 다른 글꼴로 그린 글자(fallbackGlyphs, 알 수 없으면 null)이고, status 는 ready(모두 그 글꼴로 그림)·fallback(다른 글꼴로 그린 글자가 있음)·timeout(시간 안에 다 불러오지 못함) 중 하나다. 글자가 없으면 fonts 가 없다. 기본(on_font_fallback continue)은 fallback·timeout 이어도 파일을 만들고 알리기만 한다."
nav: "tools"
tool: "photo_export"
generated: true
---

# 사진 편집기 — 파일로 내보내기

`photo_export` · 바로 조회 · 내 컴퓨터

현재 디자인을 이미지 파일로 내보내는 작업을 시작하고 job 을 돌려준다. 여러 페이지는 zip 하나로 묶고, pdf 는 페이지마다 한 쪽인 PDF 한 파일로 만든다. svg 는 활성 페이지 한 장만 — 글자·도형은 벡터, 사진은 PNG 로 담는다. 인쇄용이면 dpi 를 준다. 오래 걸리면 state running 인 job 을 먼저 돌려준다. photo_job_status 로 끝났는지 확인한 뒤 gallery_export_save 로 파일을 받는다. 응답을 놓쳤으면 같은 operation_id 로 다시 부른다 — 새로 내보내지 않고 그때 시작한 job 을 돌려준다(replayed true). 그리기 전에 글자에 쓴 글꼴을 정해진 시간 안에서 불러오고(기다리는 시간은 늘지 않는다), 응답과 photo_job_status 의 fonts 에 그 결과를 싣는다: faces 는 글꼴(family·weight·style)마다 캔버스가 그 글꼴로 그렸는지(drawn), 실제로 그린 글꼴(actualFont), 그 글꼴에 없어 다른 글꼴로 그린 글자(fallbackGlyphs, 알 수 없으면 null)이고, status 는 ready(모두 그 글꼴로 그림)·fallback(다른 글꼴로 그린 글자가 있음)·timeout(시간 안에 다 불러오지 못함) 중 하나다. 글자가 없으면 fonts 가 없다. 기본(on_font_fallback continue)은 fallback·timeout 이어도 파일을 만들고 알리기만 한다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `format` | 문자열 | X | 파일 형식. 생략 시 png. pdf 는 글자도 그림으로 담긴다. svg 는 글꼴 이름만 담는다 |
| `dpi` | 정수 | X | 인쇄 해상도. 주면 scale 대신 쓰고 PNG·JPEG·PDF 에 그 dpi 를 적는다(쪽 크기는 그대로). webp·svg 에는 줄 수 없다 |
| `scale` | 정수 | X | 배율(1~4). 긴 변 8192px 를 넘지 않게 줄어든다. 생략 시 1 |
| `pages` | 문자열 | X | 'active' 는 활성 페이지 한 장, 'all' 은 모든 페이지를 zip 으로. 생략 시 active |
| `transparent` | 참/거짓 | X | PNG·WebP 에서 배경을 투명하게 둔다 |
| `operation_id` | 문자열 | X | 호출자가 정한 작업 id. 같은 값과 같은 설정으로 다시 부르면 처음 시작한 job 을 돌려준다. 편집기 탭을 새로 열면 잊는다 |
| `on_font_fallback` | 문자열 | X | 글꼴이 fallback·timeout 일 때 할 일. continue(기본)는 그대로 파일을 만들고, abort 는 파일을 만들지 않고 job 을 failed 로 끝내며 error 에 어떤 글꼴 때문인지 적는다 |
| `editor_session` | 문자열 | X | photo_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [사진 편집기 — 내보내기 진행 확인](/tools/photo-editor/photo_job_status/) `photo_job_status`
- [편집기 결과 파일 저장](/tools/gallery/gallery_export_save/) `gallery_export_save`
- [사진 편집기 — 현재 프로젝트 확인](/tools/photo-editor/photo_project_get/) `photo_project_get`
- [사진 편집기 — 새 프로젝트 만들기](/tools/photo-editor/photo_project_new/) `photo_project_new`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
