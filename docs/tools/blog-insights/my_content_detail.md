---
layout: "dl-tool"
title: "글 조회수 추이"
description: "내 블로그 특정 글의 일별 조회수 추이 + 참여 지표(평균 머문 시간·공감수)를 조회한다. '이 글 얼마나 오래 읽었어/공감 추이는' 질문에 사용. contentId는 my_top_content/my_soaring 등의 결과에서 가져온다."
nav: "tools"
tool: "my_content_detail"
generated: true
---

# 글 조회수 추이

`my_content_detail` · 바로 조회 · 내 데이터

내 블로그 특정 글의 일별 조회수 추이 + 참여 지표(평균 머문 시간·공감수)를 조회한다. '이 글 얼마나 오래 읽었어/공감 추이는' 질문에 사용. contentId는 my_top_content/my_soaring 등의 결과에서 가져온다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `contentId` | 문자열 | O | 글 URL(=contentId) |
| `days` | 숫자 | X | 조회 일수 (기본 14) |

## 함께 쓰는 도구

- [인기 콘텐츠](/tools/blog-brief/my_top_content/) `my_top_content`
- [급상승 콘텐츠](/tools/blog-brief/my_soaring/) `my_soaring`
- [글 독자 성별·연령](/tools/blog-insights/my_content_audience/) `my_content_audience`
- [유입 검색어](/tools/blog-insights/my_inflow/) `my_inflow`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
