---
layout: "dl-tool"
title: "편집기 결과 파일 저장"
description: "photo_export·video_export 로 끝난 작업의 결과 파일을 저장한다. MCP 로 부르면 연결 프로그램의 내보내기 폴더에 저장하고 파일 경로를 돌려주고, 패널에서는 다운로드 폴더에 받는다. 저장할 때마다 사용자에게 확인을 받는다."
nav: "tools"
tool: "gallery_export_save"
generated: true
---

# 편집기 결과 파일 저장

`gallery_export_save` · 매번 물어봄 · 내 컴퓨터

photo_export·video_export 로 끝난 작업의 결과 파일을 저장한다. MCP 로 부르면 연결 프로그램의 내보내기 폴더에 저장하고 파일 경로를 돌려주고, 패널에서는 다운로드 폴더에 받는다. 저장할 때마다 사용자에게 확인을 받는다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `job` | 문자열 | O | photo_export 또는 video_export 가 준 job |
| `artifact` | 정수 | X | 결과 파일이 여럿일 때(영상+소리) 하나만 저장할 순번. 생략 시 전부 |

## 함께 쓰는 도구

- [사진 편집기 — 파일로 내보내기](/tools/photo-editor/photo_export/) `photo_export`
- [영상 편집기 — 파일로 내보내기](/tools/video-editor/video_export/) `video_export`
- [갤러리 — 내 컴퓨터 사진 넣기](/tools/gallery/gallery_image_add/) `gallery_image_add`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
