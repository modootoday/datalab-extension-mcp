---
layout: "dl-tool"
title: "상위글 갭 분석"
description: "특정 키워드의 상위노출 블로그 글들이 공통으로 다루는 내용(포화)과 아무도 다루지 않는 빈틈(콘텐츠 갭)을 분석하고, 내 글이 상위 글을 넘어설 차별화 앵글과 본문 목차를 제안한다. serp_pattern_analyze로 상위글 본문을 먼저 분석했다면 그 결과(commonSections·coverageGaps)를 patterns로 넘겨라 — 실측 근거로 더 정확해진다."
nav: "tools"
tool: "benchmark_gap"
generated: true
---

# 상위글 갭 분석

`benchmark_gap` · 바로 조회 · 공개 데이터

특정 키워드의 상위노출 블로그 글들이 공통으로 다루는 내용(포화)과 아무도 다루지 않는 빈틈(콘텐츠 갭)을 분석하고, 내 글이 상위 글을 넘어설 차별화 앵글과 본문 목차를 제안한다. serp_pattern_analyze로 상위글 본문을 먼저 분석했다면 그 결과(commonSections·coverageGaps)를 patterns로 넘겨라 — 실측 근거로 더 정확해진다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `keyword` | 문자열 | O | 분석할 상위노출 키워드 |
| `patterns` | 객체 | X | serp_pattern_analyze 결과(commonSections·coverageGaps) — 있으면 실측 근거로 사용 |

## 함께 쓰는 도구

- [상위글 본문 패턴](/tools/serp-watch/serp_pattern_analyze/) `serp_pattern_analyze`
- [카페 발행량](/tools/benchmark/cafe_volume/) `cafe_volume`
- [블로그 상위글 벤치마크](/tools/benchmark/blog_rank_profile/) `blog_rank_profile`
- [카페 커뮤니티 분석](/tools/benchmark/cafe_community_profile/) `cafe_community_profile`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
