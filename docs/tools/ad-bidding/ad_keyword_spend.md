---
layout: "dl-tool"
title: "키워드별 광고비"
description: "집행 중인 검색광고에서 키워드별 노출·클릭·광고비를 조회하고, 노출이 제한된 키워드가 있으면 사유를 함께 알려준다. '어느 키워드가 돈을 먹나', '이 키워드가 왜 안 나가나'에 사용. 조회 전용이며 입찰가를 바꾸지 않는다. 사용자 SearchAd 인증정보 필요."
nav: "tools"
tool: "ad_keyword_spend"
generated: true
---

# 키워드별 광고비

`ad_keyword_spend` · 바로 조회 · 내 데이터

집행 중인 검색광고에서 키워드별 노출·클릭·광고비를 조회하고, 노출이 제한된 키워드가 있으면 사유를 함께 알려준다. '어느 키워드가 돈을 먹나', '이 키워드가 왜 안 나가나'에 사용. 조회 전용이며 입찰가를 바꾸지 않는다. 사용자 SearchAd 인증정보 필요.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `campaignName` | 문자열 | X | 특정 캠페인만 볼 때 이름 일부. 생략하면 첫 캠페인 |
| `datePreset` | 문자열 | X | 조회 기간. 기본 lastweek |

## 함께 쓰는 도구

- [월간 검색량·경쟁도](/tools/ad-bidding/ad_keyword_stats/) `ad_keyword_stats`
- [최소 노출 입찰가](/tools/ad-bidding/ad_min_exposure_bid/) `ad_min_exposure_bid`
- [입찰가 추정](/tools/ad-bidding/ad_estimate_bid/) `ad_estimate_bid`
- [예상 성과 추정](/tools/ad-bidding/ad_estimate_performance/) `ad_estimate_performance`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
