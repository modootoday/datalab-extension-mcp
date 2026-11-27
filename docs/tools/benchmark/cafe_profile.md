---
layout: "dl-tool"
title: "카페 프로필"
description: "대상 카페의 프로필(카페명·회원수 등)을 조회한다. cafeId로 식별."
nav: "tools"
tool: "cafe_profile"
generated: true
---

# 카페 프로필

`cafe_profile` · 바로 조회 · 공개 데이터

대상 카페의 프로필(카페명·회원수 등)을 조회한다. cafeId로 식별.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `cafeId` | 문자열 | O | 카페 URL slug (cafe.naver.com/\<slug\>의 slug, 예: joonggonara). 숫자 clubid 아님. |

## 함께 쓰는 도구

- [카페 발행량](/tools/benchmark/cafe_volume/) `cafe_volume`
- [블로그 상위글 벤치마크](/tools/benchmark/blog_rank_profile/) `blog_rank_profile`
- [카페 커뮤니티 분석](/tools/benchmark/cafe_community_profile/) `cafe_community_profile`
- [블로그 프로필](/tools/benchmark/blog_profile/) `blog_profile`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
