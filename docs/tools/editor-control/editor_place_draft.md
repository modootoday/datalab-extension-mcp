---
layout: "dl-tool"
title: "글쓰기 창에 초안 넣기(빈 본문에만)"
description: "초안을 글쓰기 창에 배치한다. 창이 없으면 새로 열어 담고, 비어 있으면 그대로 넣는다. 이미 내용이 있으면 지우지 않고 거절하며 어떤 도구를 써야 하는지 알려 준다. write_draft 가 준 초안 참조(dr_...)가 있으면 본문을 옮겨 적지 않고 artifactId 로 넘기면 제목도 같이 반영된다. 제목을 본문 마크다운 안에 다시 적으면 본문에도 제목이 한 번 더 들어간다. 결과의 titleApplied 가 제목을 어떻게 처리했는지 알려 준다."
nav: "tools"
tool: "editor_place_draft"
generated: true
---

# 글쓰기 창에 초안 넣기(빈 본문에만)

`editor_place_draft` · 매번 물어봄 · 내 컴퓨터

초안을 글쓰기 창에 배치한다. 창이 없으면 새로 열어 담고, 비어 있으면 그대로 넣는다. 이미 내용이 있으면 지우지 않고 거절하며 어떤 도구를 써야 하는지 알려 준다. write_draft 가 준 초안 참조(dr_...)가 있으면 본문을 옮겨 적지 않고 artifactId 로 넘기면 제목도 같이 반영된다. 제목을 본문 마크다운 안에 다시 적으면 본문에도 제목이 한 번 더 들어간다. 결과의 titleApplied 가 제목을 어떻게 처리했는지 알려 준다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `markdown` | 문자열 | X | 배치할 본문 마크다운 (artifactId 를 쓰면 생략) |
| `artifactId` | 문자열 | X | write_draft 가 돌려준 초안 참조(dr_...). 본문을 대신한다. |
| `title` | 문자열 | X | 글 제목 (선택). artifactId 를 주면 그 초안의 제목이 쓰이므로 보통 생략한다. 제목이 비어 있을 때만 채운다. |
| `blankLines` | 문자열 | X | 선택. 마크다운의 빈 줄 처리. 기본 collapse 는 빈 줄을 버린다. preserve 는 문단 구분(빈 줄 1개)을 넘는 빈 줄을 빈 문단으로 남긴다. 예: 문단 사이에 빈 줄이 2개면 빈 문단 1개. 한 번에 최대 10개까지. |

## 함께 쓰는 도구

- [초안 작성](/tools/keyword-research/write_draft/) `write_draft`
- [내부 링크 제안](/tools/editor-control/internal_links/) `internal_links`
- [글쓰기 창 열기](/tools/editor-control/editor_open_window/) `editor_open_window`
- [편집기 창 정리 (하나만 남기고 닫기)](/tools/editor-control/editor_reduce_windows/) `editor_reduce_windows`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
