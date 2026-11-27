---
layout: "dl-tool"
title: "스마트스토어 일별 매출"
description: "스마트스토어 일별 매출(총 매출·과세/면세·신용카드·현금영수증)을 부가세 신고 기준으로 조회한다. '이번 달 얼마 팔았나', '과세 면세 얼마나'에 사용. 조회 전용. 사용자 커머스API 인증정보 필요."
nav: "tools"
tool: "commerce_sales"
generated: true
---

# 스마트스토어 일별 매출

`commerce_sales` · 바로 조회 · 내 데이터

스마트스토어 일별 매출(총 매출·과세/면세·신용카드·현금영수증)을 부가세 신고 기준으로 조회한다. '이번 달 얼마 팔았나', '과세 면세 얼마나'에 사용. 조회 전용. 사용자 커머스API 인증정보 필요.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `days` | 숫자 | X | 조회 기간(일). 기본 30일, 최대 365일. 기간이 길면 결과를 주별·월별로 자동으로 묶어서 보여준다 — 별도 단위 지정은 없다 |

## 함께 쓰는 도구

- [스마트스토어 정산 내역](/tools/store-settlement/commerce_settlement/) `commerce_settlement`
- [스마트스토어 주문 상태](/tools/store-settlement/commerce_orders/) `commerce_orders`
- [스마트스토어 상품 수정 요청](/tools/store-settlement/commerce_product_issues/) `commerce_product_issues`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
