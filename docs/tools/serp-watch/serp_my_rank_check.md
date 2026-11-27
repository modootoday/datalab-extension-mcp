---
layout: "dl-tool"
title: "내 글 검색 순위"
description: "특정 키워드의 네이버 검색 결과(블로그탭·통합검색 상위)에서 내 블로그(또는 지정 blogId) 글이 몇 위에 노출되는지 확인한다. '내 글 이 키워드로 몇 위야 / 통합검색에 떠?' 질문에 사용. blogId 생략 시 본인 블로그."
nav: "tools"
tool: "serp_my_rank_check"
generated: true
---

# 내 글 검색 순위

`serp_my_rank_check` · 바로 조회 · 공개 데이터

특정 키워드의 네이버 검색 결과(블로그탭·통합검색 상위)에서 내 블로그(또는 지정 blogId) 글이 몇 위에 노출되는지 확인한다. '내 글 이 키워드로 몇 위야 / 통합검색에 떠?' 질문에 사용. blogId 생략 시 본인 블로그.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `keyword` | 문자열 | O | 검색어 |
| `blogId` | 문자열 | X | 확인할 블로그 id (생략 시 내 블로그) |

## 함께 쓰는 도구

- [블로그 검색](/tools/serp-watch/search_blog/) `search_blog`
- [통합검색 결과](/tools/serp-watch/search_total/) `search_total`
- [뉴스 검색](/tools/serp-watch/search_news/) `search_news`
- [카페 검색](/tools/serp-watch/search_cafe/) `search_cafe`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
