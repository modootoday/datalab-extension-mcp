---
layout: "dl-tool"
title: "인플루언서 통계"
description: "네이버 인플루언서의 공개 통계(구독자 수 등)를 조회한다. 영향력 파악에 사용. urlId를 생략하면 로그인 채널 자동 탐색을 시도하며, 탐색할 수 없으면 no-url-id를 반환한다. '누적 조회수'는 네이버가 본인 채널에서만 제공해 타 채널은 항상 null이다 — 구독자 등 더 풍부한 공개 지표는 influencer_profile 사용."
nav: "tools"
tool: "influencer_stats"
generated: true
---

# 인플루언서 통계

`influencer_stats` · 바로 조회 · 공개 데이터

네이버 인플루언서의 공개 통계(구독자 수 등)를 조회한다. 영향력 파악에 사용. urlId를 생략하면 로그인 채널 자동 탐색을 시도하며, 탐색할 수 없으면 no-url-id를 반환한다. '누적 조회수'는 네이버가 본인 채널에서만 제공해 타 채널은 항상 null이다 — 구독자 등 더 풍부한 공개 지표는 influencer_profile 사용.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `urlId` | 문자열 | X | 인플루언서 urlId (in.naver.com/\<urlId\>의 \<urlId\>). 생략하면 로그인 채널 자동 탐색을 시도하며, 탐색할 수 없으면 no-url-id를 반환한다. |

## 함께 쓰는 도구

- [인플루언서 프로필](/tools/benchmark/influencer_profile/) `influencer_profile`
- [카페 발행량](/tools/benchmark/cafe_volume/) `cafe_volume`
- [블로그 상위글 벤치마크](/tools/benchmark/blog_rank_profile/) `blog_rank_profile`
- [카페 커뮤니티 분석](/tools/benchmark/cafe_community_profile/) `cafe_community_profile`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
