---
layout: "dl-tool"
title: "웹문서 검색"
description: "네이버 웹문서 검색 결과를 조회한다."
nav: "tools"
tool: "search_web"
generated: true
---

# 웹문서 검색

`search_web` · 바로 조회 · 공개 데이터

네이버 웹문서 검색 결과를 조회한다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `query` | 문자열 | O | 검색어 |
| `from` | 문자열 | X | 이 날짜부터 (YYYYMMDD). to 와 함께 써야 적용돼요. |
| `to` | 문자열 | X | 이 날짜까지 (YYYYMMDD). from 과 함께 써야 적용돼요. |
| `sort` | 문자열 | X | 정렬. 기본은 관련도순이고, recent 는 최신순이에요. |
| `exact` | 참/거짓 | X | 검색어를 통째로 하나의 구문으로 찾아요. |

## 함께 쓰는 도구

- [블로그 검색](/tools/serp-watch/search_blog/) `search_blog`
- [내 글 검색 순위](/tools/serp-watch/serp_my_rank_check/) `serp_my_rank_check`
- [통합검색 결과](/tools/serp-watch/search_total/) `search_total`
- [뉴스 검색](/tools/serp-watch/search_news/) `search_news`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
