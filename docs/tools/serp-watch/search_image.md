---
layout: "dl-tool"
title: "이미지 검색"
description: "네이버 이미지 검색 결과를 조회한다. 각 결과의 imageUrl은 실제 이미지 주소라, 이미지 삽입/생성 도구가 있는 환경에서는 글 삽입이나 참조 기반(img2img) 생성의 입력으로 쓸 수 있다. licence 로 이용 조건을 좁혀 재사용 가능한 것만 고를 수 있다."
nav: "tools"
tool: "search_image"
generated: true
---

# 이미지 검색

`search_image` · 바로 조회 · 공개 데이터

네이버 이미지 검색 결과를 조회한다. 각 결과의 imageUrl은 실제 이미지 주소라, 이미지 삽입/생성 도구가 있는 환경에서는 글 삽입이나 참조 기반(img2img) 생성의 입력으로 쓸 수 있다. licence 로 이용 조건을 좁혀 재사용 가능한 것만 고를 수 있다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `query` | 문자열 | O | 검색어 |
| `from` | 문자열 | X | 이 날짜부터 (YYYYMMDD). to 와 함께 써야 적용돼요. |
| `to` | 문자열 | X | 이 날짜까지 (YYYYMMDD). from 과 함께 써야 적용돼요. |
| `exact` | 참/거짓 | X | 검색어를 통째로 하나의 구문으로 찾아요. |
| `page` | 정수 | X | 몇 번째 묶음을 볼지 (1~4, 기본 1). 2 이상이면 더 아래 순위 구간을 가져오고, 순위 번호도 이어서 붙어요. |
| `licence` | 문자열 | X | 이미지 이용 조건. ccl 은 출처 표시 조건, commercial 은 상업적 이용, derivative 는 수정 가능한 것만 골라요. |

## 함께 쓰는 도구

- [블로그 검색](/tools/serp-watch/search_blog/) `search_blog`
- [내 글 검색 순위](/tools/serp-watch/serp_my_rank_check/) `serp_my_rank_check`
- [통합검색 결과](/tools/serp-watch/search_total/) `search_total`
- [뉴스 검색](/tools/serp-watch/search_news/) `search_news`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
