---
layout: "dl-tool"
title: "지역 목록"
description: "네이버 지역통계의 하위 지역 목록을 조회한다(드릴다운). code 생략/“all”=시도 목록, 시도코드=구·군, 구코드=동. 반환된 code 를 다른 지역 도구에 넘긴다."
nav: "tools"
tool: "local_regions"
generated: true
---

# 지역 목록

`local_regions` · 바로 조회 · 공개 데이터

네이버 지역통계의 하위 지역 목록을 조회한다(드릴다운). code 생략/“all”=시도 목록, 시도코드=구·군, 구코드=동. 반환된 code 를 다른 지역 도구에 넘긴다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `code` | 문자열 | X | 상위 지역코드. 생략 시 시도(최상위) 목록 |

## 함께 쓰는 도구

- [연관·추천 키워드](/tools/keyword-research/search_keywords/) `search_keywords`
- [검색어 관심도 추이](/tools/keyword-research/keyword_trend/) `keyword_trend`
- [블로그·카페 발행량](/tools/keyword-research/content_volume/) `content_volume`
- [키워드 기회 지수](/tools/keyword-research/keyword_opportunity/) `keyword_opportunity`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
