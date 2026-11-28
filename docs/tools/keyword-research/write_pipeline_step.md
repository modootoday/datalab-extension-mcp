---
layout: "dl-tool"
title: "글쓰기 단계별 안내"
description: "네이버 블로그 글 한 편을 조사부터 발행 초안까지 끝내는 절차에서, 지금 단계에 무엇을 어떻게 해야 하는지 돌려준다. 앞 단계에서 실제로 측정한 값을 findings 에 넣으면 그 수치에 맞춘 지시를 준다. 특히 구조 설계(structure)는 앞 단계 실측치에 좌우되므로 미리 적어 둘 수 없다. 아무것도 바꾸지 않으며, 결과의 nextStep 이 다음에 부를 단계다."
nav: "tools"
tool: "write_pipeline_step"
generated: true
---

# 글쓰기 단계별 안내

`write_pipeline_step` · 바로 조회 · 공개 데이터

네이버 블로그 글 한 편을 조사부터 발행 초안까지 끝내는 절차에서, 지금 단계에 무엇을 어떻게 해야 하는지 돌려준다. 앞 단계에서 실제로 측정한 값을 findings 에 넣으면 그 수치에 맞춘 지시를 준다. 특히 구조 설계(structure)는 앞 단계 실측치에 좌우되므로 미리 적어 둘 수 없다. 아무것도 바꾸지 않으며, 결과의 nextStep 이 다음에 부를 단계다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `step` | 문자열 | O | 지금 수행할 단계. 순서: keyword → serp → structure → draft → apply |
| `topic` | 문자열 | O | 글 주제 / 타깃 키워드 |
| `findings` | 문자열 | X | 앞 단계에서 실제로 측정한 것 (수치·상위글 패턴·빈틈). 없으면 생략 |

## 함께 쓰는 도구

- [연관·추천 키워드](/tools/keyword-research/search_keywords/) `search_keywords`
- [검색어 관심도 추이](/tools/keyword-research/keyword_trend/) `keyword_trend`
- [블로그·카페 발행량](/tools/keyword-research/content_volume/) `content_volume`
- [키워드 기회 지수](/tools/keyword-research/keyword_opportunity/) `keyword_opportunity`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
