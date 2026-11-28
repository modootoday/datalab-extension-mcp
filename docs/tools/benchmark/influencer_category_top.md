---
layout: "dl-tool"
title: "분야 상위 인플루언서"
description: "특정 분야(카테고리)의 상위·추천 인플루언서 목록을 조회한다. 상대 urlId 를 몰라도 분야만으로 경쟁 인플루언서를 찾는 발굴 진입점이고, categoryId 는 influencer_categories 에서 얻는다. 상위 20명까지만 돌려주며 분야 전체가 아니다. 결과의 urlId 는 blogId 가 아니어서 블로그 도구에 그대로 넣으면 엉뚱한 블로그를 찾고, 연결된 네이버 블로그는 influencer_profile 이 주는 blogId 로 얻는다."
nav: "tools"
tool: "influencer_category_top"
generated: true
---

# 분야 상위 인플루언서

`influencer_category_top` · 바로 조회 · 공개 데이터

특정 분야(카테고리)의 상위·추천 인플루언서 목록을 조회한다. 상대 urlId 를 몰라도 분야만으로 경쟁 인플루언서를 찾는 발굴 진입점이고, categoryId 는 influencer_categories 에서 얻는다. 상위 20명까지만 돌려주며 분야 전체가 아니다. 결과의 urlId 는 blogId 가 아니어서 블로그 도구에 그대로 넣으면 엉뚱한 블로그를 찾고, 연결된 네이버 블로그는 influencer_profile 이 주는 blogId 로 얻는다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `categoryId` | 문자열 | O | 인플루언서 분야 categoryId |

## 함께 쓰는 도구

- [인플루언서 분야](/tools/benchmark/influencer_categories/) `influencer_categories`
- [인플루언서 프로필](/tools/benchmark/influencer_profile/) `influencer_profile`
- [카페 발행량](/tools/benchmark/cafe_volume/) `cafe_volume`
- [블로그 상위글 벤치마크](/tools/benchmark/blog_rank_profile/) `blog_rank_profile`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
