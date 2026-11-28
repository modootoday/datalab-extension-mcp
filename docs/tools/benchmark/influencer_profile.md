---
layout: "dl-tool"
title: "인플루언서 프로필"
description: "네이버 인플루언서의 프로필(채널명·분야·팬 수·대표 주제 등)을 조회한다. 대상 페이지의 임베드 데이터를 읽어 풍부하게 반환. urlId를 생략하면 로그인 채널 자동 탐색을 시도하며, 탐색할 수 없으면 no-url-id를 반환한다. 연결된 네이버 블로그가 있으면 blogId를 함께 준다(urlId≠blogId — blog_* 도구에는 이 blogId를 사용)."
nav: "tools"
tool: "influencer_profile"
generated: true
---

# 인플루언서 프로필

`influencer_profile` · 바로 조회 · 공개 데이터

네이버 인플루언서의 프로필(채널명·분야·팬 수·대표 주제 등)을 조회한다. 대상 페이지의 임베드 데이터를 읽어 풍부하게 반환. urlId를 생략하면 로그인 채널 자동 탐색을 시도하며, 탐색할 수 없으면 no-url-id를 반환한다. 연결된 네이버 블로그가 있으면 blogId를 함께 준다(urlId≠blogId — blog_* 도구에는 이 blogId를 사용).

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `urlId` | 문자열 | X | 인플루언서 urlId (in.naver.com/\<urlId\>의 \<urlId\>). 생략하면 로그인 채널 자동 탐색을 시도하며, 탐색할 수 없으면 no-url-id를 반환한다. |

## 함께 쓰는 도구

- [카페 발행량](/tools/benchmark/cafe_volume/) `cafe_volume`
- [블로그 상위글 벤치마크](/tools/benchmark/blog_rank_profile/) `blog_rank_profile`
- [카페 커뮤니티 분석](/tools/benchmark/cafe_community_profile/) `cafe_community_profile`
- [블로그 프로필](/tools/benchmark/blog_profile/) `blog_profile`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
