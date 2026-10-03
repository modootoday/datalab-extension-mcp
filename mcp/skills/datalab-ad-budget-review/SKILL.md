---
name: datalab-ad-budget-review
description: 검색광고 계정의 잔액·실적·키워드 지출을 점검하고 입찰 대안을 비교한다. "광고비가 어디서 새나", "예산이 며칠 남았나", "입찰가를 어떻게 잡나" 요청에 사용한다. 실제 집행값과 예상값을 섞거나 입찰가를 자동 변경하지 않는다.
license: Proprietary
metadata:
  surfaces: both
  install: optional
  tools: ad_bizmoney, ad_campaign_stats, ad_keyword_spend, ad_keyword_stats, ad_competition_density, ad_min_exposure_bid, ad_estimate_bid, ad_estimate_performance, ad_performance_balance, ad_average_position_bid, ad_estimate_bulk
---

## MCP 도구 연결

요청에 필요한 실제 도구가 현재 목록에 직접 보이면 그 도구를 사용한다. 보이지 않으면
사용자의 원래 의도를 `datalab_find_tools`에 보내고, 반환된 스키마와 도구 이름만 사용해
`datalab_call`로 실행한다. 도구 이름이나 인자를 지어내지 않는다. 결과가
`awaiting_confirm`이면 원래 호출을 반복하지 말고 ticket을 `datalab_confirm_status`로
확인한다.


# 검색광고 예산 점검

이미 집행된 결과를 먼저 확인하고, 입찰 추정은 별도의 대안으로 비교한다.

## 절차

1. 점검 기간, 캠페인, 목표가 없으면 확인한다. 기간만 없으면 최근 7일을 쓴다고 밝힌다.
2. `ad_bizmoney`, `ad_campaign_stats`, `ad_keyword_spend`로 잔액, 실제 지출, 노출과 클릭을 확인한다.
3. 새 키워드를 검토할 때만 `ad_keyword_stats`, `ad_competition_density`, `ad_min_exposure_bid`로 수요와 경쟁, 노출 기준을 본다.
4. 입찰 대안은 `ad_performance_balance` 또는 `ad_estimate_bulk`로 비교한다. 특정 순위 목표가 있을 때만 `ad_average_position_bid`를 쓴다.
5. 결과를 "실제 집행", "예상 시나리오", "다음 점검"으로 나누고 근거가 된 기간과 기기를 함께 적는다.

## 경계

- 검색광고 계정 자격증명이 없으면 설정 필요 상태를 설명하고 수치를 지어내지 않는다.
- 예상 노출·클릭·비용을 실제 실적이나 성과 보장으로 쓰지 않는다.
- PC와 모바일 결과를 합치지 않는다.
- 도구는 조회와 추정 전용이다. 입찰가, 캠페인, 예산을 변경했다고 말하지 않는다.
