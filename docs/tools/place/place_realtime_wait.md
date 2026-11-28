---
layout: "dl-tool"
title: "실시간 웨이팅"
description: "네이버 웨이팅을 쓰는 매장의 지금 실시간 대기 현황(대기 팀 수·인원·예상 대기시간)을 조회한다. '이 식당 지금 웨이팅 얼마나 걸려? 붐벼?' 질문에 사용. 웨이팅 미사용 매장은 데이터가 없다. placeId로 식별."
nav: "tools"
tool: "place_realtime_wait"
generated: true
---

# 실시간 웨이팅

`place_realtime_wait` · 바로 조회 · 내 데이터

네이버 웨이팅을 쓰는 매장의 지금 실시간 대기 현황(대기 팀 수·인원·예상 대기시간)을 조회한다. '이 식당 지금 웨이팅 얼마나 걸려? 붐벼?' 질문에 사용. 웨이팅 미사용 매장은 데이터가 없다. placeId로 식별.

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
