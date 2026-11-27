---
layout: "dl-tool"
title: "내 발행글 읽기"
description: "내 블로그의 이미 발행된 글 '본문'을 읽어온다(제목·본문 마크다운·단어수). 성과 데이터로 고른 글을 다시 쓰거나(리라이트) 분석할 때, editor 로 넘기기 전에 사용한다. contentId 는 my_top_content/my_revenue_ranks/my_soaring 결과의 contentId(글 URL)다. (my_content_info 는 메타·조회수만 주므로, 본문이 필요하면 이 도구를 쓴다.)"
nav: "tools"
tool: "my_content_read"
generated: true
---

# 내 발행글 읽기

`my_content_read` · 바로 조회 · 내 데이터

내 블로그의 이미 발행된 글 '본문'을 읽어온다(제목·본문 마크다운·단어수). 성과 데이터로 고른 글을 다시 쓰거나(리라이트) 분석할 때, editor 로 넘기기 전에 사용한다. contentId 는 my_top_content/my_revenue_ranks/my_soaring 결과의 contentId(글 URL)다. (my_content_info 는 메타·조회수만 주므로, 본문이 필요하면 이 도구를 쓴다.)

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `contentId` | 문자열 | O | 글 URL(=contentId) |

## 함께 쓰는 도구

- [인기 콘텐츠](/tools/blog-brief/my_top_content/) `my_top_content`
- [광고 수익 상위](/tools/blog-insights/my_revenue_ranks/) `my_revenue_ranks`
- [급상승 콘텐츠](/tools/blog-brief/my_soaring/) `my_soaring`
- [글 정보](/tools/blog-insights/my_content_info/) `my_content_info`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
