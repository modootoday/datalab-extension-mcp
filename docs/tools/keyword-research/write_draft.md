---
layout: "dl-tool"
title: "초안 작성"
description: "주어진 주제로 리서치와 분석을 거쳐 초안까지 수행해 네이버 블로그 글 초안을 작성한다. 결과는 제목(title)과 본문(markdown)이 분리되어 나온다. 앞 단계에서 이미 상위글 분석·구조 설계를 했다면 structure(설계된 소제목 목록)와 seoAeoGeo(AEO/GEO 스펙)를 함께 넘겨라. 그러면 재리서치를 건너뛰고 그 구조로 바로 초안을 쓴다. 사용자가 글을 써달라고 할 때 사용한다."
nav: "tools"
tool: "write_draft"
generated: true
---

# 초안 작성

`write_draft` · 바로 조회 · 공개 데이터

주어진 주제로 리서치와 분석을 거쳐 초안까지 수행해 네이버 블로그 글 초안을 작성한다. 결과는 제목(title)과 본문(markdown)이 분리되어 나온다. 앞 단계에서 이미 상위글 분석·구조 설계를 했다면 structure(설계된 소제목 목록)와 seoAeoGeo(AEO/GEO 스펙)를 함께 넘겨라. 그러면 재리서치를 건너뛰고 그 구조로 바로 초안을 쓴다. 사용자가 글을 써달라고 할 때 사용한다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `topic` | 문자열 | O | 글 주제 / 키워드 |
| `structure` | 객체 | X | 앞 단계에서 설계한 콘텐츠 구조(있으면 재리서치 생략). outline=소제목 순서. |
| `seoAeoGeo` | 객체 | X | seo_aeo_geo_spec 결과(SEO/AEO/GEO 반영 사항). |
| `targetChars` | 숫자 | X | 본문 목표 글자수(공백 포함). 사용자가 분량을 말하면 여기에 숫자로 넣어라. 한 번에 쓸 수 있는 최대는 약 12000자이고, 그보다 크게 주면 그 값으로 줄여서 쓴다. |

## 함께 쓰는 도구

- [연관·추천 키워드](/tools/keyword-research/search_keywords/) `search_keywords`
- [검색어 관심도 추이](/tools/keyword-research/keyword_trend/) `keyword_trend`
- [블로그·카페 발행량](/tools/keyword-research/content_volume/) `content_volume`
- [키워드 기회 지수](/tools/keyword-research/keyword_opportunity/) `keyword_opportunity`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
