---
layout: "dl-tool"
title: "입찰가 추정"
description: "검색광고 키워드의 입찰가 추정치를 조회한다. 이 값은 광고를 낼 때 광고주가 내는 비용이지 블로그 수익이 아니다 — 수익 추정 근거로 쓰지 마라. device=PC|MOBILE(기본 MOBILE). 사용자 SearchAd 인증정보 필요."
nav: "tools"
tool: "ad_estimate_bid"
generated: true
---

# 입찰가 추정

`ad_estimate_bid` · 바로 조회 · 내 데이터

검색광고 키워드의 입찰가 추정치를 조회한다. 이 값은 광고를 낼 때 광고주가 내는 비용이지 블로그 수익이 아니다 — 수익 추정 근거로 쓰지 마라. device=PC|MOBILE(기본 MOBILE). 사용자 SearchAd 인증정보 필요.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `keywords` | 목록 | O | 조회할 키워드 |
| `device` | 문자열 | X | 조회 기기(생략 시 MOBILE). 같은 키워드도 PC 와 모바일의 값이 다르다 |

## 함께 쓰는 도구

- [월간 검색량·경쟁도](/tools/ad-bidding/ad_keyword_stats/) `ad_keyword_stats`
- [최소 노출 입찰가](/tools/ad-bidding/ad_min_exposure_bid/) `ad_min_exposure_bid`
- [예상 성과 추정](/tools/ad-bidding/ad_estimate_performance/) `ad_estimate_performance`
- [효율 균형 입찰가](/tools/ad-bidding/ad_performance_balance/) `ad_performance_balance`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
