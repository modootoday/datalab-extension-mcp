---
layout: "dl-tool"
title: "내 발행글 읽기"
description: "내 블로그의 이미 발행된 글 '본문'을 읽어온다(제목·본문 마크다운·단어수). 성과 데이터로 고른 글을 다시 쓰거나(리라이트) 분석할 때, 편집기로 넘기기 전에 쓴다. contentId 는 my_top_content 같은 내 글 성과 도구 결과의 contentId(글 URL)다. 메타정보와 조회수만 필요하면 my_content_info 를 쓴다."
nav: "tools"
tool: "my_content_read"
generated: true
---

# 내 발행글 읽기

`my_content_read` · 바로 조회 · 내 데이터

내 블로그의 이미 발행된 글 '본문'을 읽어온다(제목·본문 마크다운·단어수). 성과 데이터로 고른 글을 다시 쓰거나(리라이트) 분석할 때, 편집기로 넘기기 전에 쓴다. contentId 는 my_top_content 같은 내 글 성과 도구 결과의 contentId(글 URL)다. 메타정보와 조회수만 필요하면 my_content_info 를 쓴다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `contentId` | 문자열 | O | 글 URL(=contentId) |

## 함께 쓰는 도구

- [인기 콘텐츠](/tools/blog-brief/my_top_content/) `my_top_content`
- [글 정보](/tools/blog-insights/my_content_info/) `my_content_info`
- [글 독자 성별·연령](/tools/blog-insights/my_content_audience/) `my_content_audience`
- [유입 검색어](/tools/blog-insights/my_inflow/) `my_inflow`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
