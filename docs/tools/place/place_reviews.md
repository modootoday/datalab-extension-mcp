---
layout: "dl-tool"
title: "방문자 리뷰"
description: "최근 방문자 리뷰(본문·태그·방문맥락·사장님답글)를 조회한다. 평판·반응 파악에 사용. placeId로 식별."
nav: "tools"
tool: "place_reviews"
generated: true
---

# 방문자 리뷰

`place_reviews` · 바로 조회 · 내 데이터

최근 방문자 리뷰(본문·태그·방문맥락·사장님답글)를 조회한다. 평판·반응 파악에 사용. placeId로 식별.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `placeId` | 문자열 | O | 플레이스 ID (map.naver.com 주소의 숫자) |
| `limit` | 정수 | X | 돌려줄 개수 (1~20, 기본 10). 더 크게 적어도 20개까지만 나와요. |

## 함께 쓰는 도구

- [플레이스 검색](/tools/place/place_search/) `place_search`
- [플레이스 자동완성](/tools/place/place_autocomplete/) `place_autocomplete`
- [장소 정보](/tools/place/place_info/) `place_info`
- [리뷰 통계](/tools/place/place_review_stats/) `place_review_stats`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
