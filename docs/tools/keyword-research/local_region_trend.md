---
layout: "dl-tool"
title: "지역별 관심 추이"
description: "한 업종(categoryCode)이 여러 지역(regionCodes)에서 보이는 검색/관심 추이를 비교 조회한다. '강남구 vs 서초구 카페 트렌드' 같은 질문에 사용. range=YYYYMMDD:YYYYMMDD(기본 최근 1년). 코드는 local_job_categories / local_regions 로 먼저 확보."
nav: "tools"
tool: "local_region_trend"
generated: true
---

# 지역별 관심 추이

`local_region_trend` · 바로 조회 · 공개 데이터

한 업종(categoryCode)이 여러 지역(regionCodes)에서 보이는 검색/관심 추이를 비교 조회한다. '강남구 vs 서초구 카페 트렌드' 같은 질문에 사용. range=YYYYMMDD:YYYYMMDD(기본 최근 1년). 코드는 local_job_categories / local_regions 로 먼저 확보.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `categoryCode` | 문자열 | O | 업종코드 (local_job_categories) |
| `regionCodes` | 목록 | O | 지역코드 목록 (local_regions). 앞에서부터 10개까지만 쓰고 나머지는 버린다 |
| `range` | 문자열 | X | YYYYMMDD:YYYYMMDD (생략 가능) |

## 함께 쓰는 도구

- [지역 업종 분류](/tools/keyword-research/local_job_categories/) `local_job_categories`
- [지역 목록](/tools/keyword-research/local_regions/) `local_regions`
- [연관·추천 키워드](/tools/keyword-research/search_keywords/) `search_keywords`
- [검색어 관심도 추이](/tools/keyword-research/keyword_trend/) `keyword_trend`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
