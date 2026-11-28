---
layout: "dl-tool"
title: "쇼핑 카테고리"
description: "네이버 쇼핑 카테고리 목록(분야명 + cid)을 조회한다. 쇼핑인사이트 키워드 도구에 넘길 cid를 찾는 데 사용. query에 상품/분야명(예: '전기요')을 주면 이름·전체경로 검색으로 cid를 1스텝에 찾는다(계층 탐색 불필요); parentCid를 주면 하위 분야를 탐색한다."
nav: "tools"
tool: "shopping_categories"
generated: true
---

# 쇼핑 카테고리

`shopping_categories` · 바로 조회 · 공개 데이터

네이버 쇼핑 카테고리 목록(분야명 + cid)을 조회한다. 쇼핑인사이트 키워드 도구에 넘길 cid를 찾는 데 사용. query에 상품/분야명(예: '전기요')을 주면 이름·전체경로 검색으로 cid를 1스텝에 찾는다(계층 탐색 불필요); parentCid를 주면 하위 분야를 탐색한다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `parentCid` | 문자열 | X | 상위 분야 cid (생략 시 대분류) |
| `query` | 문자열 | X | 분야/상품명 부분 일치 검색어 (예: '전기요') — 주면 parentCid 무시 |
| `limit` | 정수 | X | 한 번에 반환할 수. 기본 50, 최대 100 |
| `cursor` | 문자열 | X | 이전 응답의 nextCursor |

## 함께 쓰는 도구

- [분야 인기 검색어](/tools/shopping/shopping_category_keywords/) `shopping_category_keywords`
- [쇼핑 클릭 추이](/tools/shopping/shopping_keyword_click/) `shopping_keyword_click`
- [쇼핑 클릭 성별](/tools/shopping/shopping_keyword_gender/) `shopping_keyword_gender`
- [쇼핑 클릭 연령](/tools/shopping/shopping_keyword_age/) `shopping_keyword_age`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
