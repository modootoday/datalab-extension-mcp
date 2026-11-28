---
layout: "dl-tool"
title: "쇼핑 클릭 성별"
description: "쇼핑 키워드의 클릭 성별 비중을 조회한다(카테고리 cid 기준). 타깃 성별 파악에 사용."
nav: "tools"
tool: "shopping_keyword_gender"
generated: true
---

# 쇼핑 클릭 성별

`shopping_keyword_gender` · 바로 조회 · 공개 데이터

쇼핑 키워드의 클릭 성별 비중을 조회한다(카테고리 cid 기준). 타깃 성별 파악에 사용.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `keyword` | 문자열 | O | 쇼핑 키워드 |
| `cid` | 문자열 | O | 쇼핑 카테고리 id (shopping_categories에서 조회한 cid) |

## 함께 쓰는 도구

- [쇼핑 카테고리](/tools/shopping/shopping_categories/) `shopping_categories`
- [분야 인기 검색어](/tools/shopping/shopping_category_keywords/) `shopping_category_keywords`
- [쇼핑 클릭 추이](/tools/shopping/shopping_keyword_click/) `shopping_keyword_click`
- [쇼핑 클릭 연령](/tools/shopping/shopping_keyword_age/) `shopping_keyword_age`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
