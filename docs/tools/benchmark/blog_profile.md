---
layout: "dl-tool"
title: "블로그 프로필"
description: "경쟁/대상 블로그의 프로필(블로그명·소개·이웃수 등)을 조회한다. blogId로 식별."
nav: "tools"
tool: "blog_profile"
generated: true
---

# 블로그 프로필

`blog_profile` · 바로 조회 · 공개 데이터

경쟁/대상 블로그의 프로필(블로그명·소개·이웃수 등)을 조회한다. blogId로 식별.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `blogId` | 문자열 | O | 대상 블로그 ID (blog.naver.com/\<blogId\>의 \<blogId\>) |

## 함께 쓰는 도구

- [카페 발행량](/tools/benchmark/cafe_volume/) `cafe_volume`
- [블로그 상위글 벤치마크](/tools/benchmark/blog_rank_profile/) `blog_rank_profile`
- [카페 커뮤니티 분석](/tools/benchmark/cafe_community_profile/) `cafe_community_profile`
- [최신 글](/tools/benchmark/blog_posts/) `blog_posts`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.4 기준.
