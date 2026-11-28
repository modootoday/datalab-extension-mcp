---
layout: "dl-tool"
title: "최신 글"
description: "대상 블로그의 최신 글 목록을 조회한다. 발행 패턴·주제 파악에 사용. blogId로 식별. 더 예전 글은 page를 올려서 이어 본다."
nav: "tools"
tool: "blog_posts"
generated: true
---

# 최신 글

`blog_posts` · 바로 조회 · 공개 데이터

대상 블로그의 최신 글 목록을 조회한다. 발행 패턴·주제 파악에 사용. blogId로 식별. 더 예전 글은 page를 올려서 이어 본다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `blogId` | 문자열 | O | 대상 블로그 ID (blog.naver.com/\<blogId\>의 \<blogId\>) |
| `limit` | 정수 | X | 돌려줄 개수 (1~30, 기본 10). 더 크게 적어도 30개까지만 나와요. |
| `page` | 정수 | X | 몇 번째 묶음을 볼지 (1~10, 기본 1). 1이 가장 최근 글이고, 올릴수록 더 예전 글이에요. |

## 함께 쓰는 도구

- [카페 발행량](/tools/benchmark/cafe_volume/) `cafe_volume`
- [블로그 상위글 벤치마크](/tools/benchmark/blog_rank_profile/) `blog_rank_profile`
- [카페 커뮤니티 분석](/tools/benchmark/cafe_community_profile/) `cafe_community_profile`
- [블로그 프로필](/tools/benchmark/blog_profile/) `blog_profile`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
