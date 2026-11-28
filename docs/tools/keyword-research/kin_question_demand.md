---
layout: "dl-tool"
title: "지식iN 질문 수요"
description: "네이버 지식iN 검색 결과에서 질문 제목을 모아 글감·검색의도 신호를 뽑아 본다. 통합검색의 지식iN 섹션 파싱에 의존하므로 키워드에 따라 결과가 없을 수 있다(available:false = 섹션 미노출/파싱 실패이지 수요 없음이 아님)."
nav: "tools"
tool: "kin_question_demand"
generated: true
---

# 지식iN 질문 수요

`kin_question_demand` · 바로 조회 · 공개 데이터

네이버 지식iN 검색 결과에서 질문 제목을 모아 글감·검색의도 신호를 뽑아 본다. 통합검색의 지식iN 섹션 파싱에 의존하므로 키워드에 따라 결과가 없을 수 있다(available:false = 섹션 미노출/파싱 실패이지 수요 없음이 아님).

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `query` | 문자열 | O | 기준 키워드 |

## 함께 쓰는 도구

- [연관·추천 키워드](/tools/keyword-research/search_keywords/) `search_keywords`
- [검색어 관심도 추이](/tools/keyword-research/keyword_trend/) `keyword_trend`
- [블로그·카페 발행량](/tools/keyword-research/content_volume/) `content_volume`
- [키워드 기회 지수](/tools/keyword-research/keyword_opportunity/) `keyword_opportunity`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
