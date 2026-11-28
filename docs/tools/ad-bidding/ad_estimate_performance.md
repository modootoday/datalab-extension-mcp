---
layout: "dl-tool"
title: "예상 성과 추정"
description: "검색광고에서 키워드를 특정 입찰가로 집행했을 때의 예상 성과(노출수·클릭수·비용·CTR·평균CPC)를 입찰가별로 추정한다. 'X원 입찰하면 클릭 몇 번/얼마' 같은 질문에 사용. device=PC|MOBILE(기본 MOBILE). bids 미지정 시 기본 구간. 사용자 SearchAd 인증정보 필요."
nav: "tools"
tool: "ad_estimate_performance"
generated: true
---

# 예상 성과 추정

`ad_estimate_performance` · 바로 조회 · 내 데이터

검색광고에서 키워드를 특정 입찰가로 집행했을 때의 예상 성과(노출수·클릭수·비용·CTR·평균CPC)를 입찰가별로 추정한다. 'X원 입찰하면 클릭 몇 번/얼마' 같은 질문에 사용. device=PC|MOBILE(기본 MOBILE). bids 미지정 시 기본 구간. 사용자 SearchAd 인증정보 필요.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `keyword` | 문자열 | O | 단일 키워드 |
| `device` | 문자열 | X | 조회 기기(생략 시 MOBILE). 같은 키워드도 PC 와 모바일의 값이 다르다 |
| `bids` | 목록 | X | 추정할 입찰가(원) 목록. 생략 가능 |

## 함께 쓰는 도구

- [월간 검색량·경쟁도](/tools/ad-bidding/ad_keyword_stats/) `ad_keyword_stats`
- [최소 노출 입찰가](/tools/ad-bidding/ad_min_exposure_bid/) `ad_min_exposure_bid`
- [입찰가 추정](/tools/ad-bidding/ad_estimate_bid/) `ad_estimate_bid`
- [효율 균형 입찰가](/tools/ad-bidding/ad_performance_balance/) `ad_performance_balance`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
