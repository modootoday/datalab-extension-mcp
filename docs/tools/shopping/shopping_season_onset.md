---
layout: "dl-tool"
title: "쇼핑 시즌 진단"
description: "쇼핑 키워드의 다개년 월별 수요에서 시즌 패턴(연도별 피크 월·시즌 시작 월)을 찾고, 이번 달이 시즌 전/진입/피크/하강 중 어디인지 판정한다. '수영복 시즌 언제 시작해? 지금 늦었어?' 질문에 사용. cid는 shopping_categories에서 얻는다."
nav: "tools"
tool: "shopping_season_onset"
generated: true
---

# 쇼핑 시즌 진단

`shopping_season_onset` · 바로 조회 · 공개 데이터

쇼핑 키워드의 다개년 월별 수요에서 시즌 패턴(연도별 피크 월·시즌 시작 월)을 찾고, 이번 달이 시즌 전/진입/피크/하강 중 어디인지 판정한다. '수영복 시즌 언제 시작해? 지금 늦었어?' 질문에 사용. cid는 shopping_categories에서 얻는다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `keyword` | 문자열 | O | 쇼핑 키워드 |
| `cid` | 문자열 | O | 쇼핑 카테고리 id (shopping_categories에서 조회한 cid) |

## 함께 쓰는 도구

- [쇼핑 카테고리](/tools/shopping/shopping_categories/) `shopping_categories`
- [분야 인기 검색어](/tools/shopping/shopping_category_keywords/) `shopping_category_keywords`
- [쇼핑 클릭 추이](/tools/shopping/shopping_keyword_click/) `shopping_keyword_click`
- [쇼핑 클릭 성별](/tools/shopping/shopping_keyword_gender/) `shopping_keyword_gender`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.3 기준.
