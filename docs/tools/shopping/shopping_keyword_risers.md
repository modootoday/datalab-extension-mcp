---
layout: "dl-tool"
title: "쇼핑 급상승 검색어"
description: "쇼핑 카테고리(cid)의 인기 검색어를 최근 7일 vs 직전 7일로 비교해 급상승·신규 진입 검색어만 추린다. '우리 카테고리 지난주 대비 뜨는 검색어 뭐야?' 질문에 사용. cid는 shopping_categories에서 얻는다. 급상승 상위 20개까지만 돌려준다. (두 기간을 차례로 조회하므로 수십 초 걸릴 수 있음)"
nav: "tools"
tool: "shopping_keyword_risers"
generated: true
---

# 쇼핑 급상승 검색어

`shopping_keyword_risers` · 바로 조회 · 공개 데이터

쇼핑 카테고리(cid)의 인기 검색어를 최근 7일 vs 직전 7일로 비교해 급상승·신규 진입 검색어만 추린다. '우리 카테고리 지난주 대비 뜨는 검색어 뭐야?' 질문에 사용. cid는 shopping_categories에서 얻는다. 급상승 상위 20개까지만 돌려준다. (두 기간을 차례로 조회하므로 수십 초 걸릴 수 있음)

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `cid` | 문자열 | O | 쇼핑 카테고리 cid (shopping_categories 결과) |

## 함께 쓰는 도구

- [쇼핑 카테고리](/tools/shopping/shopping_categories/) `shopping_categories`
- [분야 인기 검색어](/tools/shopping/shopping_category_keywords/) `shopping_category_keywords`
- [쇼핑 클릭 추이](/tools/shopping/shopping_keyword_click/) `shopping_keyword_click`
- [쇼핑 클릭 성별](/tools/shopping/shopping_keyword_gender/) `shopping_keyword_gender`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
