---
layout: "dl-tool"
title: "글쓰기 단계별 안내"
description: "네이버 블로그 글 한 편을 조사부터 발행 초안까지 끝내는 절차에서, 지금 단계에 무엇을 어떻게 해야 하는지 돌려준다. 앞 단계에서 실제로 측정한 값을 findings 에 넣으면 그 수치에 맞춘 지시를 준다 — 특히 구조 설계(structure)는 앞 단계 실측치에 좌우되므로 미리 적어 둘 수 없다.\n단계:\n1. keyword — 키워드 리서치 (산출: 타깃 키워드와 그 수요·포화도 수치)\n2. serp — 상위 노출 콘텐츠 패턴 분석 (산출: 상위 글의 공통 구조와 아직 아무도 다루지 않은 빈틈)\n3. structure — SEO/AEO/GEO 구조 설계 (산출: 소제목 순서(outline)와 AEO/GEO 스펙)\n4. draft — 초안 작성 (산출: 제목과 본문 초안)\n5. apply — 에디터 반영 (산출: 글쓰기 창에 실제로 반영된 원고)"
nav: "tools"
tool: "write_pipeline_step"
generated: true
---

# 글쓰기 단계별 안내

`write_pipeline_step` · 바로 조회 · 공개 데이터

네이버 블로그 글 한 편을 조사부터 발행 초안까지 끝내는 절차에서, 지금 단계에 무엇을 어떻게 해야 하는지 돌려준다. 앞 단계에서 실제로 측정한 값을 findings 에 넣으면 그 수치에 맞춘 지시를 준다 — 특히 구조 설계(structure)는 앞 단계 실측치에 좌우되므로 미리 적어 둘 수 없다.
단계:
1. keyword — 키워드 리서치 (산출: 타깃 키워드와 그 수요·포화도 수치)
2. serp — 상위 노출 콘텐츠 패턴 분석 (산출: 상위 글의 공통 구조와 아직 아무도 다루지 않은 빈틈)
3. structure — SEO/AEO/GEO 구조 설계 (산출: 소제목 순서(outline)와 AEO/GEO 스펙)
4. draft — 초안 작성 (산출: 제목과 본문 초안)
5. apply — 에디터 반영 (산출: 글쓰기 창에 실제로 반영된 원고)

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `step` | 문자열 | O | 지금 수행할 단계 |
| `topic` | 문자열 | O | 글 주제 / 타깃 키워드 |
| `findings` | 문자열 | X | 앞 단계에서 실제로 측정한 것 (수치·상위글 패턴·빈틈). 없으면 생략 |

## 함께 쓰는 도구

- [연관·추천 키워드](/tools/keyword-research/search_keywords/) `search_keywords`
- [검색어 관심도 추이](/tools/keyword-research/keyword_trend/) `keyword_trend`
- [블로그·카페 발행량](/tools/keyword-research/content_volume/) `content_volume`
- [키워드 기회 지수](/tools/keyword-research/keyword_opportunity/) `keyword_opportunity`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
