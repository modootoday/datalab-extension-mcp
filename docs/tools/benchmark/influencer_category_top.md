---
layout: "dl-tool"
title: "분야 상위 인플루언서"
description: "특정 분야(카테고리)의 상위/추천 인플루언서 목록을 조회한다. '이 분야에서 누가 잘나가?', 경쟁 인플루언서 발굴에 사용 — 상대 urlId를 몰라도 분야만으로 찾을 수 있다(발굴 진입점). categoryId는 influencer_categories에서 얻고, 각 결과의 urlId로 influencer_profile/influencer_posts를 이어 분석한다. 주의: urlId는 blogId가 아니다 — blog_* 도구가 필요하면 influencer_profile의 blogId(연결된 네이버 블로그)를 거쳐라. 상위 20명까지만 돌려준다 — 분야 전체가 아니다."
nav: "tools"
tool: "influencer_category_top"
generated: true
---

# 분야 상위 인플루언서

`influencer_category_top` · 바로 조회 · 공개 데이터

특정 분야(카테고리)의 상위/추천 인플루언서 목록을 조회한다. '이 분야에서 누가 잘나가?', 경쟁 인플루언서 발굴에 사용 — 상대 urlId를 몰라도 분야만으로 찾을 수 있다(발굴 진입점). categoryId는 influencer_categories에서 얻고, 각 결과의 urlId로 influencer_profile/influencer_posts를 이어 분석한다. 주의: urlId는 blogId가 아니다 — blog_* 도구가 필요하면 influencer_profile의 blogId(연결된 네이버 블로그)를 거쳐라. 상위 20명까지만 돌려준다 — 분야 전체가 아니다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `categoryId` | 문자열 | O | 인플루언서 분야 categoryId |

## 함께 쓰는 도구

- [인플루언서 분야](/tools/benchmark/influencer_categories/) `influencer_categories`
- [인플루언서 프로필](/tools/benchmark/influencer_profile/) `influencer_profile`
- [인플루언서 콘텐츠](/tools/benchmark/influencer_posts/) `influencer_posts`
- [카페 발행량](/tools/benchmark/cafe_volume/) `cafe_volume`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
