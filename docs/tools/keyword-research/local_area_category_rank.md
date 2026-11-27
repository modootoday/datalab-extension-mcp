---
layout: "dl-tool"
title: "지역 업종 순위"
description: "한 지역(regionCode)에서 여러 업종(categoryCodes)의 상대 순위/관심도를 조회한다. '이 동네에서 어떤 업종이 인기' 같은 질문에 사용. 코드는 local_regions / local_job_categories 로 먼저 확보."
nav: "tools"
tool: "local_area_category_rank"
generated: true
---

# 지역 업종 순위

`local_area_category_rank` · 바로 조회 · 공개 데이터

한 지역(regionCode)에서 여러 업종(categoryCodes)의 상대 순위/관심도를 조회한다. '이 동네에서 어떤 업종이 인기' 같은 질문에 사용. 코드는 local_regions / local_job_categories 로 먼저 확보.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `regionCode` | 문자열 | O | 지역코드 (local_regions) |
| `categoryCodes` | 목록 | O | 업종코드 목록 (local_job_categories). 앞에서부터 20개까지만 쓰고 나머지는 버린다 |

## 함께 쓰는 도구

- [지역 목록](/tools/keyword-research/local_regions/) `local_regions`
- [지역 업종 분류](/tools/keyword-research/local_job_categories/) `local_job_categories`
- [연관·추천 키워드](/tools/keyword-research/search_keywords/) `search_keywords`
- [검색어 관심도 추이](/tools/keyword-research/keyword_trend/) `keyword_trend`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
