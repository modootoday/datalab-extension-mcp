---
layout: "dl-tool"
title: "평균 순위 입찰가"
description: "검색광고에서 키워드별 목표 평균 노출순위를 달성하기 위한 입찰가를 추정한다. '이 키워드 1위(상위) 노출하려면 얼마' 같은 질문에 사용. items=[{keyword, position}], position은 목표 순위(1=최상단). device=PC|MOBILE(기본 MOBILE). 사용자 SearchAd 인증정보 필요."
nav: "tools"
tool: "ad_average_position_bid"
generated: true
---

# 평균 순위 입찰가

`ad_average_position_bid` · 바로 조회 · 내 데이터

검색광고에서 키워드별 목표 평균 노출순위를 달성하기 위한 입찰가를 추정한다. '이 키워드 1위(상위) 노출하려면 얼마' 같은 질문에 사용. items=[{keyword, position}], position은 목표 순위(1=최상단). device=PC|MOBILE(기본 MOBILE). 사용자 SearchAd 인증정보 필요.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `items` | 목록 | O | 키워드 + 목표 순위 목록 (최대 10개, 넘으면 앞 10개만 조회한다) |
| `device` | 문자열 | X | 조회 기기(생략 시 MOBILE). 같은 키워드도 PC 와 모바일의 값이 다르다 |

## 함께 쓰는 도구

- [월간 검색량·경쟁도](/tools/ad-bidding/ad_keyword_stats/) `ad_keyword_stats`
- [최소 노출 입찰가](/tools/ad-bidding/ad_min_exposure_bid/) `ad_min_exposure_bid`
- [입찰가 추정](/tools/ad-bidding/ad_estimate_bid/) `ad_estimate_bid`
- [예상 성과 추정](/tools/ad-bidding/ad_estimate_performance/) `ad_estimate_performance`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
