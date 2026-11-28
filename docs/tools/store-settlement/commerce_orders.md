---
layout: "dl-tool"
title: "스마트스토어 주문 상태"
description: "스마트스토어 주문 상태 변동을 최근 24시간 이내로 집계한다(상태별 건수·클레임 건수·배송지 변경 건수). '오늘 주문 어땠나', '클레임 있었나'에 사용. 조회 전용이며 주문번호·구매자 정보는 반환하지 않는다. 사용자 커머스API 인증정보 필요."
nav: "tools"
tool: "commerce_orders"
generated: true
---

# 스마트스토어 주문 상태

`commerce_orders` · 바로 조회 · 내 데이터

스마트스토어 주문 상태 변동을 최근 24시간 이내로 집계한다(상태별 건수·클레임 건수·배송지 변경 건수). '오늘 주문 어땠나', '클레임 있었나'에 사용. 조회 전용이며 주문번호·구매자 정보는 반환하지 않는다. 사용자 커머스API 인증정보 필요.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `hours` | 숫자 | X | 조회 시간(시간). 기본 24, 최대 24 — 네이버가 24시간을 넘기면 거부한다 |

## 함께 쓰는 도구

- [스마트스토어 정산 내역](/tools/store-settlement/commerce_settlement/) `commerce_settlement`
- [스마트스토어 일별 매출](/tools/store-settlement/commerce_sales/) `commerce_sales`
- [스마트스토어 상품 수정 요청](/tools/store-settlement/commerce_product_issues/) `commerce_product_issues`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
