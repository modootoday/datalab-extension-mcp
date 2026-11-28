---
layout: "dl-tool"
title: "방문·조회 추이"
description: "내 블로그의 방문/조회/순방문 추이를 조회한다. 성장 추세 파악에 사용. kind=visit|view|uv. 기간은 period(이번 달/지난달/이번 주/최근 N일/직접), '지난달 대비' 같은 증감은 compare로 요청한다."
nav: "tools"
tool: "my_traffic_series"
generated: true
---

# 방문·조회 추이

`my_traffic_series` · 바로 조회 · 내 데이터

내 블로그의 방문/조회/순방문 추이를 조회한다. 성장 추세 파악에 사용. kind=visit|view|uv. 기간은 period(이번 달/지난달/이번 주/최근 N일/직접), '지난달 대비' 같은 증감은 compare로 요청한다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `days` | 숫자 | X | 조회 일수 (기본 14, period 없을 때) |
| `kind` | 문자열 | X | 무엇을 셀지(생략 시 visit). visit=방문수, view=조회수(한 방문에 여러 번), uv=순방문(같은 사람은 하루 한 번) |
| `period` | 객체 | X | 기간 지정 (mtd=이번 달, last_month=지난달, wtd=이번 주, rolling=최근 N일, range=직접). 생략 시 최근 N일. |
| `compare` | 문자열 | X | 전 기간/전년 대비 증감 (prev_period=직전 동기간, prev_year=작년 동기간) |

## 함께 쓰는 도구

- [발행 리듬 진단](/tools/blog-brief/my_publish_calendar/) `my_publish_calendar`
- [내 블로그 요약](/tools/blog-brief/my_blog_summary/) `my_blog_summary`
- [오늘 브리핑](/tools/blog-brief/my_daily_brief/) `my_daily_brief`
- [인기 콘텐츠](/tools/blog-brief/my_top_content/) `my_top_content`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
