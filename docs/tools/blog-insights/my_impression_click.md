---
layout: "dl-tool"
title: "광고 클릭 추이"
description: "내 블로그 광고의 클릭 추이를 조회한다. 광고 반응(클릭) 변화 파악에 사용. 기간은 period, '지난달 대비'는 compare로 요청한다."
nav: "tools"
tool: "my_impression_click"
generated: true
---

# 광고 클릭 추이

`my_impression_click` · 바로 조회 · 내 데이터

내 블로그 광고의 클릭 추이를 조회한다. 광고 반응(클릭) 변화 파악에 사용. 기간은 period, '지난달 대비'는 compare로 요청한다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `days` | 숫자 | X | 조회 일수 (기본 14, period 없을 때) |
| `period` | 객체 | X | 기간 지정 (mtd=이번 달, last_month=지난달, wtd=이번 주, rolling=최근 N일, range=직접). 생략 시 최근 N일. |
| `compare` | 문자열 | X | 전 기간/전년 대비 증감 (prev_period=직전 동기간, prev_year=작년 동기간) |

## 함께 쓰는 도구

- [글 독자 성별·연령](/tools/blog-insights/my_content_audience/) `my_content_audience`
- [유입 검색어](/tools/blog-insights/my_inflow/) `my_inflow`
- [독자 성별·연령](/tools/blog-insights/my_audience/) `my_audience`
- [유입 경로](/tools/blog-insights/my_inflow_domain/) `my_inflow_domain`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
