---
layout: "dl-tool"
title: "샵윈도 상품"
description: "매장이 네이버 플레이스에 연동한 스마트스토어 상품(샵윈도)을 조회한다. 상품명·판매가·할인가·리뷰수·평점을 준다. '이 매장 온라인으로 뭐 팔아? 상품 리뷰 어때?' 질문에 사용. placeId로 식별."
nav: "tools"
tool: "place_shop_window"
generated: true
---

# 샵윈도 상품

`place_shop_window` · 바로 조회 · 내 데이터

매장이 네이버 플레이스에 연동한 스마트스토어 상품(샵윈도)을 조회한다. 상품명·판매가·할인가·리뷰수·평점을 준다. '이 매장 온라인으로 뭐 팔아? 상품 리뷰 어때?' 질문에 사용. placeId로 식별.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `placeId` | 문자열 | O | 대상 장소 ID (place_search 결과의 id) |

## 함께 쓰는 도구

- [플레이스 검색](/tools/place/place_search/) `place_search`
- [플레이스 자동완성](/tools/place/place_autocomplete/) `place_autocomplete`
- [장소 정보](/tools/place/place_info/) `place_info`
- [리뷰 통계](/tools/place/place_review_stats/) `place_review_stats`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
