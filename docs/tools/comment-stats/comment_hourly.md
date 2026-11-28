---
layout: "dl-tool"
title: "댓글 시간대"
description: "네이버 뉴스 댓글의 시간대별 작성량을 조회한다. 활동 피크 시간 파악에 사용. 특정 날짜는 baseDate, 특정 분야는 categoryCode로 좁힌다."
nav: "tools"
tool: "comment_hourly"
generated: true
---

# 댓글 시간대

`comment_hourly` · 바로 조회 · 공개 데이터

네이버 뉴스 댓글의 시간대별 작성량을 조회한다. 활동 피크 시간 파악에 사용. 특정 날짜는 baseDate, 특정 분야는 categoryCode로 좁힌다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `baseDate` | 문자열 | X | 기준일 YYYY-MM-DD (생략 시 어제) |
| `categoryCode` | 문자열 | X | 뉴스 분야 코드로 여론을 좁힌다. 생략하면 전체(ALL). 모르는 코드를 주면 거절하지 않고 전체로 돌아가므로, 결과의 appliedCategoryCode 를 보고 실제로 좁혀졌는지 확인한다 |

## 함께 쓰는 도구

- [댓글 추이](/tools/comment-stats/comment_trend/) `comment_trend`
- [댓글 작성자 추이](/tools/comment-stats/comment_user_trend/) `comment_user_trend`
- [댓글 성별·연령](/tools/comment-stats/comment_genderage/) `comment_genderage`
- [댓글 기기](/tools/comment-stats/comment_device/) `comment_device`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
