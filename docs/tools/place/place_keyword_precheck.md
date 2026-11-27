---
layout: "dl-tool"
title: "대표키워드 사전점검"
description: "내 가게 상호명과 대표키워드를 네이버 스마트플레이스에 등록/수정하기 전에 금지어·사전심사 여부를 미리 점검한다. '이 대표키워드 등록해도 돼? 금지어 걸려?' 질문에 사용. 걸린 금지어·사전심사 대상·정규화 제안을 돌려준다. 로그인·사장님 세션 없이도 동작한다(사전심사는 공개 규칙 기반)."
nav: "tools"
tool: "place_keyword_precheck"
generated: true
---

# 대표키워드 사전점검

`place_keyword_precheck` · 바로 조회 · 내 데이터

내 가게 상호명과 대표키워드를 네이버 스마트플레이스에 등록/수정하기 전에 금지어·사전심사 여부를 미리 점검한다. '이 대표키워드 등록해도 돼? 금지어 걸려?' 질문에 사용. 걸린 금지어·사전심사 대상·정규화 제안을 돌려준다. 로그인·사장님 세션 없이도 동작한다(사전심사는 공개 규칙 기반).

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `businessName` | 문자열 | O | 상호명 (내 가게 이름) |
| `representativeKeywords` | 목록 | O | 점검할 대표키워드 목록 |
| `nameEn` | 문자열 | X | 영문 상호명 (선택) |

## 함께 쓰는 도구

- [플레이스 검색](/tools/place/place_search/) `place_search`
- [플레이스 자동완성](/tools/place/place_autocomplete/) `place_autocomplete`
- [장소 정보](/tools/place/place_info/) `place_info`
- [리뷰 통계](/tools/place/place_review_stats/) `place_review_stats`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
