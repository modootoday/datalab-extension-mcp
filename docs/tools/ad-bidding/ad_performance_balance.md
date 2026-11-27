---
layout: "dl-tool"
title: "효율 균형 입찰가"
description: "검색광고에서 키워드의 '효율 균형점'(비용 대비 성과가 꺾이는 권장 입찰가 1개)을 추정한다. 입찰가 기준점을 빠르게 잡을 때 사용. device=PC|MOBILE(기본 MOBILE). 사용자 SearchAd 인증정보 필요."
nav: "tools"
tool: "ad_performance_balance"
generated: true
---

# 효율 균형 입찰가

`ad_performance_balance` · 바로 조회 · 내 데이터

검색광고에서 키워드의 '효율 균형점'(비용 대비 성과가 꺾이는 권장 입찰가 1개)을 추정한다. 입찰가 기준점을 빠르게 잡을 때 사용. device=PC|MOBILE(기본 MOBILE). 사용자 SearchAd 인증정보 필요.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `keyword` | 문자열 | O | 단일 키워드 |
| `device` | 문자열 | X | 조회 기기(생략 시 MOBILE). 같은 키워드도 PC 와 모바일의 값이 다르다 |

## 함께 쓰는 도구

- [월간 검색량·경쟁도](/tools/ad-bidding/ad_keyword_stats/) `ad_keyword_stats`
- [최소 노출 입찰가](/tools/ad-bidding/ad_min_exposure_bid/) `ad_min_exposure_bid`
- [입찰가 추정](/tools/ad-bidding/ad_estimate_bid/) `ad_estimate_bid`
- [예상 성과 추정](/tools/ad-bidding/ad_estimate_performance/) `ad_estimate_performance`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
