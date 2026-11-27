---
layout: "dl-tool"
title: "갤러리 — 내 컴퓨터 사진 넣기"
description: "이 컴퓨터에 있는 사진 파일을 확장의 이미지 갤러리에 넣는다. 넣고 나면 photo_image_add_from_gallery 로 사진 편집기 캔버스에 넣을 수 있다. 편집기 창이 열려 있지 않아도 된다. 직접 만든 이미지를 편집기에서 쓰려면 이 도구를 먼저 부른다. 넣을 때마다 사용자에게 확인을 받는다."
nav: "tools"
tool: "gallery_image_add"
generated: true
---

# 갤러리 — 내 컴퓨터 사진 넣기

`gallery_image_add` · 매번 물어봄 · 내 컴퓨터

이 컴퓨터에 있는 사진 파일을 확장의 이미지 갤러리에 넣는다. 넣고 나면 photo_image_add_from_gallery 로 사진 편집기 캔버스에 넣을 수 있다. 편집기 창이 열려 있지 않아도 된다. 직접 만든 이미지를 편집기에서 쓰려면 이 도구를 먼저 부른다. 넣을 때마다 사용자에게 확인을 받는다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `path` | 문자열 | X | 이 컴퓨터에 있는 사진의 전체 경로 (예: /Users/me/photo.png). PNG·JPEG·GIF·WebP, 최대 10MB. handle 과 둘 중 하나만 |
| `handle` | 문자열 | X | media_stage_commit 이 돌려준 handle. 파일 경로를 쓸 수 없는 호스트가 올린 사진을 넣을 때 path 대신 쓴다 |
| `label` | 문자열 | X | 갤러리 목록에서 이 사진을 알아볼 짧은 이름 |
| `role` | 문자열 | X | 호출자가 붙이는 역할 메모(예: 전면, 후면, 세로 파생). 확인된 사실이 아니라 caller.role 로 따로 남는다 |
| `ai_generated` | 참/거짓 | X | 호출자가 아는 AI 생성 여부. caller.aiGenerated 로 남고, 확장이 확인한 disclosure 와 섞이지 않는다 |
| `derived_from` | 객체 | X | 이 사진이 갤러리의 다른 사진에서 잘라 낸 파생본일 때. photo_gallery_list 의 lineage 가 원본 바이트와 맞는지 대조한다 |

## 함께 쓰는 도구

- [사진 편집기 — 갤러리 사진 넣기](/tools/photo-editor/photo_image_add_from_gallery/) `photo_image_add_from_gallery`
- [편집기 결과 파일 저장](/tools/gallery/gallery_export_save/) `gallery_export_save`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
