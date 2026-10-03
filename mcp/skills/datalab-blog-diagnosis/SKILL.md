---
name: datalab-blog-diagnosis
description: 내 네이버 블로그의 방문·조회·유입·독자·체류·재방문·수익 변화를 실제 통계로 진단한다. "유입이 왜 줄었지", "지난달 성과 분석", "어떤 글이 문제인지" 요청에 사용한다. 상관관계를 원인으로 단정하거나 누락값을 0으로 처리하지 않는다.
license: Proprietary
metadata:
  surfaces: both
  install: optional
  tools: my_daily_brief, my_blog_summary, my_traffic_series, my_top_content, my_inflow, my_inflow_domain, my_audience, my_device, my_dwell, my_revisit, my_revenue, my_content_info, my_content_detail
---

## MCP 도구 연결

요청에 필요한 실제 도구가 현재 목록에 직접 보이면 그 도구를 사용한다. 보이지 않으면
사용자의 원래 의도를 `datalab_find_tools`에 보내고, 반환된 스키마와 도구 이름만 사용해
`datalab_call`로 실행한다. 도구 이름이나 인자를 지어내지 않는다. 결과가
`awaiting_confirm`이면 원래 호출을 반복하지 말고 ticket을 `datalab_confirm_status`로
확인한다.


# 블로그 성과 진단

먼저 무엇이 변했는지 측정하고, 그다음 가능한 설명을 같은 기간의 지표로 좁힌다.

## 절차

1. 질문의 기간과 비교 기준을 정한다. 없으면 최근 기간과 직전 동일 길이 기간을 사용한다고 밝힌다.
2. `my_daily_brief`, `my_blog_summary`, `my_traffic_series`, `my_top_content`로 변화의 위치와
   크기를 확인한다.
3. 변화가 실제로 보일 때만 `my_inflow`, `my_inflow_domain`, `my_audience`, `my_device`,
   `my_dwell`, `my_revisit`, `my_revenue` 중 설명에 필요한 최소 지표를 추가한다.
4. 특정 글이 기여했는지는 `my_content_info`와 `my_content_detail`로 확인한다.
5. 결과를 "관측", "가능한 설명", "추가 확인"으로 분리한다.

## 판정 규칙

- 비교 지표의 기간과 단위를 맞춘다.
- 누락, 미지원, 부분 집계를 0으로 바꾸지 않는다.
- 함께 움직였다는 이유로 원인이라고 쓰지 않는다.
- 실제로 측정하지 않은 미래 성과를 지어내지 않는다.
