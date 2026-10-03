---
name: datalab-shopping-demand
description: 네이버 쇼핑의 카테고리·키워드 클릭 추이와 급상승어·시즌·이용자 구성을 분석한다. "이 상품 수요가 오르나", "시즌은 언제 시작하나", "누구에게 맞추나" 요청에 사용한다. 클릭지수를 판매량이나 매출로 바꾸어 말하지 않는다.
license: Proprietary
metadata:
  surfaces: both
  install: optional
  tools: shopping_categories, shopping_category_keywords, shopping_keyword_click, shopping_keyword_gender, shopping_keyword_age, shopping_keyword_device, shopping_category_click, shopping_category_gender, shopping_category_age, shopping_category_device, shopping_category_rank, shopping_keyword_risers, shopping_season_onset
---

## MCP 도구 연결

요청에 필요한 실제 도구가 현재 목록에 직접 보이면 그 도구를 사용한다. 보이지 않으면
사용자의 원래 의도를 `datalab_find_tools`에 보내고, 반환된 스키마와 도구 이름만 사용해
`datalab_call`로 실행한다. 도구 이름이나 인자를 지어내지 않는다. 결과가
`awaiting_confirm`이면 원래 호출을 반복하지 말고 ticket을 `datalab_confirm_status`로
확인한다.


# 쇼핑 수요 분석

카테고리를 먼저 확정하고, 변화 시점과 이용자 구성을 필요한 만큼만 확인한다.

## 절차

1. 상품이나 키워드와 대상 카테고리를 확인한다. cid가 없으면 `shopping_categories`로 찾고 임의의 카테고리를 고르지 않는다.
2. 카테고리 전체를 볼 때는 `shopping_category_click`, `shopping_category_rank`, `shopping_category_keywords`로 규모 변화와 인기어를 확인한다.
3. 특정 키워드는 `shopping_keyword_click`, `shopping_keyword_risers`, `shopping_season_onset`으로 최근 변화와 시즌 위치를 확인한다.
4. 타깃이나 채널 결정이 필요할 때만 키워드 또는 카테고리의 성별·연령·기기 도구를 추가한다.
5. 결과를 "관측된 수요", "시즌 위치", "타깃·채널 시사점", "추가 확인"으로 나눈다.

## 판정 규칙

- 상대 클릭지수를 판매량, 구매자 수, 매출로 바꾸어 쓰지 않는다.
- 급상승 목록의 조회 범위 밖 이탈을 수요 소멸로 단정하지 않는다.
- 시즌 시작 기준은 도구가 밝힌 휴리스틱이며 네이버의 공식 판정으로 쓰지 않는다.
- 성별·연령·기기 비중으로 개인의 구매 의도나 미래 판매량을 지어내지 않는다.
