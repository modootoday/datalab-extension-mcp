---
layout: "dl-tool"
title: "SEO·AEO·GEO 스펙"
description: "타깃 키워드로 SEO·AEO(답변엔진: 즉답/FAQ)·GEO(생성형 AI 인용 최적화) 반영 스펙을 설계한다. serp_pattern_analyze의 공통섹션·빈틈(patterns)을 넘기면 실제 상위글 구조에 근거해 설계한다. 결과는 초안 작성 단계에 그대로 넘겨 반영한다."
nav: "tools"
tool: "seo_aeo_geo_spec"
generated: true
---

# SEO·AEO·GEO 스펙

`seo_aeo_geo_spec` · 바로 조회 · 공개 데이터

타깃 키워드로 SEO·AEO(답변엔진: 즉답/FAQ)·GEO(생성형 AI 인용 최적화) 반영 스펙을 설계한다. serp_pattern_analyze의 공통섹션·빈틈(patterns)을 넘기면 실제 상위글 구조에 근거해 설계한다. 결과는 초안 작성 단계에 그대로 넘겨 반영한다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `keyword` | 문자열 | O | 타깃 키워드 |
| `patterns` | 객체 | X | serp_pattern_analyze 결과(commonSections·coverageGaps) — 있으면 근거로 활용 |

## 함께 쓰는 도구

- [상위글 본문 패턴](/tools/serp-watch/serp_pattern_analyze/) `serp_pattern_analyze`
- [연관·추천 키워드](/tools/keyword-research/search_keywords/) `search_keywords`
- [검색어 관심도 추이](/tools/keyword-research/keyword_trend/) `keyword_trend`
- [블로그·카페 발행량](/tools/keyword-research/content_volume/) `content_volume`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
