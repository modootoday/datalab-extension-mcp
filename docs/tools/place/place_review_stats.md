---
layout: "dl-tool"
title: "리뷰 통계"
description: "방문자 리뷰 통계(카운트·평점·별점분포·votedKeyword '이런 점이 좋아요'·주제·메뉴)를 조회한다. placeId로 식별. 별점분포(starDistribution)의 score(몇 점 버킷인지)는 네이버가 더 이상 내려주지 않아 null이다 — count/avgRating만 신뢰."
nav: "tools"
tool: "place_review_stats"
generated: true
---

# 리뷰 통계

`place_review_stats` · 바로 조회 · 내 데이터

방문자 리뷰 통계(카운트·평점·별점분포·votedKeyword '이런 점이 좋아요'·주제·메뉴)를 조회한다. placeId로 식별. 별점분포(starDistribution)의 score(몇 점 버킷인지)는 네이버가 더 이상 내려주지 않아 null이다 — count/avgRating만 신뢰.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `placeId` | 문자열 | O | 대상 장소 ID (place_search 결과의 id) |

## 함께 쓰는 도구

- [플레이스 검색](/tools/place/place_search/) `place_search`
- [플레이스 자동완성](/tools/place/place_autocomplete/) `place_autocomplete`
- [장소 정보](/tools/place/place_info/) `place_info`
- [방문자 리뷰](/tools/place/place_reviews/) `place_reviews`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
