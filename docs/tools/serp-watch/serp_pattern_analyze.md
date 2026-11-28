---
layout: "dl-tool"
title: "상위글 본문 패턴"
description: "네이버 블로그 탭 상위 글의 '본문'을 실제로 읽어 공통 섹션 구조·다루지 않은 빈틈(coverageGaps)·제목/신선도 패턴을 데이터로 분석한다. search_blog(제목만)·blog_rank_profile(제목·신선도)과 달리 상위 글 본문 소제목까지 파고든다. 상위 글 구조를 벤치마크하거나 차별화 각도를 찾을 때 사용. (상위 몇 개 글의 본문을 순차로 읽어 수십 초 걸릴 수 있음)"
nav: "tools"
tool: "serp_pattern_analyze"
generated: true
---

# 상위글 본문 패턴

`serp_pattern_analyze` · 바로 조회 · 공개 데이터

네이버 블로그 탭 상위 글의 '본문'을 실제로 읽어 공통 섹션 구조·다루지 않은 빈틈(coverageGaps)·제목/신선도 패턴을 데이터로 분석한다. search_blog(제목만)·blog_rank_profile(제목·신선도)과 달리 상위 글 본문 소제목까지 파고든다. 상위 글 구조를 벤치마크하거나 차별화 각도를 찾을 때 사용. (상위 몇 개 글의 본문을 순차로 읽어 수십 초 걸릴 수 있음)

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `query` | 문자열 | O | 검색어 |
| `sampleCount` | 숫자 | X | 본문을 읽을 상위 글 수(기본 3, 최대 5) |

## 함께 쓰는 도구

- [블로그 검색](/tools/serp-watch/search_blog/) `search_blog`
- [블로그 상위글 벤치마크](/tools/benchmark/blog_rank_profile/) `blog_rank_profile`
- [내 글 검색 순위](/tools/serp-watch/serp_my_rank_check/) `serp_my_rank_check`
- [통합검색 결과](/tools/serp-watch/search_total/) `search_total`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
