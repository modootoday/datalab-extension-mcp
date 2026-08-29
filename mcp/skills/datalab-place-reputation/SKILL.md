---
name: datalab-place-reputation
description: 내 네이버 플레이스의 리뷰, 감성, 답글 대기, 예약·대기·쿠폰 현황을 점검한다. "우리 매장 리뷰 분석", "평판 점검", "답글 우선순위" 요청에 사용한다. 임의의 평판 점수를 만들거나 답글을 게시하지 않는다.
license: Proprietary
metadata:
  surfaces: both
  install: optional
  tools: place_info, place_reviews, place_review_stats, place_owner_review_stats, place_owner_reviews_sentiment, place_blog_reviews, place_reply_queue, place_booking, place_realtime_wait, place_coupons
---

## MCP 도구 연결

요청에 필요한 실제 도구가 현재 목록에 직접 보이면 그 도구를 사용한다. 보이지 않으면
사용자의 원래 의도를 `datalab_find_tools`에 보내고, 반환된 스키마와 도구 이름만 사용해
`datalab_call`로 실행한다. 도구 이름이나 인자를 지어내지 않는다. 결과가
`awaiting_confirm`이면 원래 호출을 반복하지 말고 ticket을 `datalab_confirm_status`로
확인한다.


# 플레이스 평판 점검

매장 상태와 리뷰 사실을 읽고, 운영 우선순위와 답글 초안을 분리해 제안한다.

## 절차

1. `place_info`로 대상 매장을 확인한다. 매장이 여러 곳이면 임의로 선택하지 않는다.
2. `place_reviews`, `place_review_stats`, `place_owner_review_stats`,
   `place_owner_reviews_sentiment`, `place_blog_reviews`에서 기간과 표본 수를 함께 기록한다.
3. 운영 대응이 필요하면 `place_reply_queue`, `place_booking`, `place_realtime_wait`,
   `place_coupons` 중 질문에 해당하는 현황만 확인한다.
4. 결과를 "확인된 사실", "우선 확인할 항목", "답글 초안"으로 나눈다.

## 경계

- 제공된 집계 밖의 종합 평판 점수를 만들지 않는다.
- 감성 분포를 고객 전체의 생각으로 확대하지 않는다.
- 답글 초안은 답변에만 쓰며 게시하지 않는다.
- 리뷰에 없는 고객 동기나 방문 상황을 지어내지 않는다.
