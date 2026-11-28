---
layout: "dl-tool"
title: "최소 노출 입찰가"
description: "검색광고에서 키워드별 '최소 노출 입찰가'를 조회한다. 광고 진입 비용 가늠에 사용. device=PC|MOBILE(기본 MOBILE). 사용자 SearchAd 인증정보 필요."
nav: "tools"
tool: "ad_min_exposure_bid"
generated: true
---

# 최소 노출 입찰가

`ad_min_exposure_bid` · 바로 조회 · 내 데이터

검색광고에서 키워드별 '최소 노출 입찰가'를 조회한다. 광고 진입 비용 가늠에 사용. device=PC|MOBILE(기본 MOBILE). 사용자 SearchAd 인증정보 필요.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `keywords` | 목록 | O | 조회할 키워드 |
| `device` | 문자열 | X | 조회 기기(생략 시 MOBILE). 같은 키워드도 PC 와 모바일의 값이 다르다 |

## 함께 쓰는 도구

- [월간 검색량·경쟁도](/tools/ad-bidding/ad_keyword_stats/) `ad_keyword_stats`
- [입찰가 추정](/tools/ad-bidding/ad_estimate_bid/) `ad_estimate_bid`
- [예상 성과 추정](/tools/ad-bidding/ad_estimate_performance/) `ad_estimate_performance`
- [효율 균형 입찰가](/tools/ad-bidding/ad_performance_balance/) `ad_performance_balance`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
