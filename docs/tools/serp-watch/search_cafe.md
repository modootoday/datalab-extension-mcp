---
layout: "dl-tool"
title: "카페 검색"
description: "네이버 카페 검색 결과를 조회한다. 커뮤니티 반응·후기 파악에 사용."
nav: "tools"
tool: "search_cafe"
generated: true
---

# 카페 검색

`search_cafe` · 바로 조회 · 공개 데이터

네이버 카페 검색 결과를 조회한다. 커뮤니티 반응·후기 파악에 사용.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `query` | 문자열 | O | 검색어 |
| `from` | 문자열 | X | 이 날짜부터 (YYYYMMDD). to 와 함께 써야 적용돼요. |
| `to` | 문자열 | X | 이 날짜까지 (YYYYMMDD). from 과 함께 써야 적용돼요. |
| `sort` | 문자열 | X | 정렬. 기본은 관련도순이고, recent 는 최신순이에요. |
| `exact` | 참/거짓 | X | 검색어를 통째로 하나의 구문으로 찾아요. |
| `page` | 정수 | X | 몇 번째 묶음을 볼지 (1~3, 기본 1). 2 이상이면 더 아래 순위 구간을 가져오고, 순위 번호도 이어서 붙어요. |

## 함께 쓰는 도구

- [블로그 검색](/tools/serp-watch/search_blog/) `search_blog`
- [내 글 검색 순위](/tools/serp-watch/serp_my_rank_check/) `serp_my_rank_check`
- [통합검색 결과](/tools/serp-watch/search_total/) `search_total`
- [뉴스 검색](/tools/serp-watch/search_news/) `search_news`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
