---
name: datalab-commerce-health
description: 스마트스토어의 정산·매출·주문 변동·상품 검수 문제를 한 번에 점검한다. "오늘 스토어 어때", "정산과 매출이 왜 다르지", "놓친 운영 이슈 있나" 요청에 사용한다. 주문 처리나 상품 수정은 하지 않는다.
license: Proprietary
metadata:
  surfaces: both
  install: optional
  tools: commerce_settlement, commerce_sales, commerce_orders, commerce_product_issues
---

## MCP 도구 연결

요청에 필요한 실제 도구가 현재 목록에 직접 보이면 그 도구를 사용한다. 보이지 않으면
사용자의 원래 의도를 `datalab_find_tools`에 보내고, 반환된 스키마와 도구 이름만 사용해
`datalab_call`로 실행한다. 도구 이름이나 인자를 지어내지 않는다. 결과가
`awaiting_confirm`이면 원래 호출을 반복하지 말고 ticket을 `datalab_confirm_status`로
확인한다.


# 스토어 운영 점검

돈의 흐름과 당장 대응할 운영 문제를 같은 화면에서 보되 서로 다른 집계로 구분한다.

## 절차

1. 사용자가 정한 기간이 없으면 정산·매출은 최근 30일, 주문 변동은 최근 24시간을 사용한다고 밝힌다.
2. `commerce_settlement`로 다음 정산일, 정산액, 수수료, 지급 보류를 확인한다.
3. `commerce_sales`로 같은 기간의 판매 금액을 확인하고 정산액과 직접 같아야 한다고 가정하지 않는다.
4. `commerce_orders`와 `commerce_product_issues`로 클레임, 배송지 변경, 검수 수정 요청을 확인한다.
5. 결과를 "현금 흐름", "매출", "지금 확인할 운영 이슈"로 나누고 대응 우선순위를 제안한다.

## 경계

- 커머스API 자격증명이 없으면 설정 필요 상태만 설명하고 금액을 지어내지 않는다.
- 매출과 정산의 차이를 수수료, 보류, 시점 자료 없이 특정 원인으로 단정하지 않는다.
- 주문번호나 구매자 정보를 추측하지 않는다.
- 주문 처리, 발송, 취소, 상품 수정은 실행하지 않는다.
