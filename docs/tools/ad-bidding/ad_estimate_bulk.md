---
layout: "dl-tool"
title: "입찰가 매트릭스 추정"
description: "여러 키워드를 여러 입찰가로 집행했을 때의 예상 성과(노출·클릭·비용)를 한 번에 매트릭스로 추정한다. '예산을 키워드별로 어떻게 배분?' 질문에 사용. keywords 최대 5개 × bids 최대 5개. device=PC|MOBILE(기본 MOBILE). 사용자 SearchAd 인증정보 필요."
nav: "tools"
tool: "ad_estimate_bulk"
generated: true
---

# 입찰가 매트릭스 추정

`ad_estimate_bulk` · 바로 조회 · 내 데이터

여러 키워드를 여러 입찰가로 집행했을 때의 예상 성과(노출·클릭·비용)를 한 번에 매트릭스로 추정한다. '예산을 키워드별로 어떻게 배분?' 질문에 사용. keywords 최대 5개 × bids 최대 5개. device=PC|MOBILE(기본 MOBILE). 사용자 SearchAd 인증정보 필요.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `keywords` | 목록 | O | 키워드 목록 (최대 5) |
| `bids` | 목록 | O | 추정할 입찰가(원) 목록 (최대 5) |
| `device` | 문자열 | X | 조회 기기(생략 시 MOBILE). 같은 키워드도 PC 와 모바일의 값이 다르다 |

## 함께 쓰는 도구

- [월간 검색량·경쟁도](/tools/ad-bidding/ad_keyword_stats/) `ad_keyword_stats`
- [최소 노출 입찰가](/tools/ad-bidding/ad_min_exposure_bid/) `ad_min_exposure_bid`
- [입찰가 추정](/tools/ad-bidding/ad_estimate_bid/) `ad_estimate_bid`
- [예상 성과 추정](/tools/ad-bidding/ad_estimate_performance/) `ad_estimate_performance`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
