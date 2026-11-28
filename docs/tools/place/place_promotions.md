---
layout: "dl-tool"
title: "진행 중 프로모션"
description: "매장이 진행 중인 프로모션 쿠폰(제목·설명·만료·상태)을 조회한다. '이 매장 지금 쿠폰·이벤트 있어?' 질문에 사용. 프로모션 없는 매장은 데이터 없음. placeId로 식별."
nav: "tools"
tool: "place_promotions"
generated: true
---

# 진행 중 프로모션

`place_promotions` · 바로 조회 · 내 데이터

매장이 진행 중인 프로모션 쿠폰(제목·설명·만료·상태)을 조회한다. '이 매장 지금 쿠폰·이벤트 있어?' 질문에 사용. 프로모션 없는 매장은 데이터 없음. placeId로 식별.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `placeId` | 문자열 | O | 대상 장소 ID (place_search 결과의 id) |

## 함께 쓰는 도구

- [플레이스 검색](/tools/place/place_search/) `place_search`
- [플레이스 자동완성](/tools/place/place_autocomplete/) `place_autocomplete`
- [장소 정보](/tools/place/place_info/) `place_info`
- [리뷰 통계](/tools/place/place_review_stats/) `place_review_stats`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
