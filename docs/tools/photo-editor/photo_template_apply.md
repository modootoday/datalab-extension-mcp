---
layout: "dl-tool"
title: "사진 편집기 — 템플릿 적용(기존 내용 대체)"
description: "템플릿을 적용한다. mode='replace'=현재 디자인 교체, 'new_page'=새 페이지로 추가."
nav: "tools"
tool: "photo_template_apply"
generated: true
---

# 사진 편집기 — 템플릿 적용(기존 내용 대체)

`photo_template_apply` · 매번 물어봄 · 내 컴퓨터

템플릿을 적용한다. mode='replace'=현재 디자인 교체, 'new_page'=새 페이지로 추가.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `template` | 문자열 | O | 적용할 템플릿. sq-recipe(레시피 카드, 방법·팁) · sq-sale(세일 포스터, 할인·행사) · sq-quote(감성 인용구, 감성) · story-event(여름 이벤트, 할인·행사) · story-newdrop(신제품 소개, 메뉴·상품) · story-checklist(체크리스트, 방법·팁) · yt-vlog(브이로그 썸네일, 일상) · yt-tutorial(튜토리얼, 방법·팁) · yt-review(리뷰 · 비교, 후기) · blog-cover(월간 회고, 일상) · blog-howto(초보자 가이드, 방법·팁) · blog-interview(인터뷰, 일상) · sq-cafe-menu(카페 메뉴판, 메뉴·상품) · sq-promo-percent(대형 할인 프로모션, 할인·행사) · sq-inspire-serif(영감 명언 카드, 감성) · story-hiring(채용 공고, 채용) · sq-realestate(부동산 매물, 메뉴·상품) · story-webinar(웨비나 안내, 공지·안내) · sq-faq(Q&A / FAQ 카드, 공지·안내) · sq-before-after(Before / After, 후기) · yt-stat-number(통계 숫자 강조, 공지·안내) · sq-minimal-brand(미니멀 브랜드 인용, 감성) · yt-newsletter-header(뉴스레터 헤더, 공지·안내) · story-countdown(카운트다운, 할인·행사) · sq-review-card(후기 / 리뷰 카드, 후기) · sq-grid-tips(그리드 팁 모음, 방법·팁) |
| `mode` | 문자열 | O | 'replace' 는 현재 페이지의 기존 요소를 모두 지우고 템플릿으로 교체한다(되돌릴 수 없음). 'new_page' 는 새 페이지를 추가해 템플릿을 채운다(기존 내용 보존) |
| `editor_session` | 문자열 | X | photo_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [사진 편집기 — 현재 프로젝트 확인](/tools/photo-editor/photo_project_get/) `photo_project_get`
- [사진 편집기 — 새 프로젝트 만들기](/tools/photo-editor/photo_project_new/) `photo_project_new`
- [사진 편집기 — 저장된 프로젝트 목록](/tools/photo-editor/photo_project_list/) `photo_project_list`
- [사진 편집기 — 저장된 프로젝트 열기](/tools/photo-editor/photo_project_open/) `photo_project_open`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
