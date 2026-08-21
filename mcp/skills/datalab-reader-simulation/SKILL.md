---
name: datalab-reader-simulation
description: 내 블로그 독자 데이터로 초안을 독자 입장에서 점검한다. 측정된 독자 프로필을 세우고 초안이 그 독자가 실제로 묻는 질문에 답이 되는지 본다. 독자 시뮬레이션, "독자 입장에서 봐줘", 예상 질문 점검에 사용한다. 결과는 사고 도구이지 실제 반응의 증거가 아니다.
license: Proprietary
metadata:
  tools: my_audience, my_content_audience, my_followers, my_revisit, my_dwell, my_inflow, my_inflow_domain, my_device, my_country, my_content_info, my_content_read, my_content_detail, kin_question_demand, search_keywords, autocomplete_keywords, editor_read, editor_read_structure
---

# 독자 시뮬레이션

측정된 독자 데이터로 프로필을 세우고, 그 프로필로 초안이 실제로 나올 질문에 답이 되는지
점검한다. 산출물은 점검 목록이다 — 반응 예측이나 점수가 아니다.

## 두 단계, 한 스킬

1. **프로필** — 이 블로그 독자에 대해 도구가 실제로 알려주는 것만 정리한다.
2. **대조** — 같은 주제에서 사람들이 실제로 묻는 질문을 근거로, 초안이 무엇에 답이 안 되어
   있는지 표시한다.

프로필만 세워 달라는 요청도 받는다(1단계까지만 하고 멈춘다). 대조는 프로필 없이는 근거가
없으므로 항상 1단계부터 지나간다.

## 1단계. 독자 프로필

쓰는 도구: `my_audience` · `my_content_audience`(특정 글을 지정했을 때) · `my_followers` ·
`my_revisit` · `my_dwell` · `my_inflow` · `my_inflow_domain` · `my_device` · `my_country`.
이 도구들은 **이 블로그를 실제로 읽은 사람들**의 집계다.

도구가 준 값만 적는다. 성별·연령 구간이 안 나오면 그 항목을 통째로 뺀다 — "대략 20~30대로
추정" 같은 채움말을 쓰지 않는다. 프로필에 없는 항목은 2단계에서도 근거로 쓸 수 없다.

### 쓰지 않는 도구 — 이 블로그 독자가 아니다

`shopping_keyword_gender` · `shopping_keyword_age` · `shopping_keyword_device` ·
`shopping_category_gender` · `shopping_category_age` · `shopping_category_device` 는 **그
키워드·카테고리를 검색한 사람들**의 집계다. `comment_genderage` · `comment_country` ·
`comment_device` · `comment_hourly` 는 **뉴스 기사 댓글 작성자**의 집계다.

둘 다 이 블로그를 읽는 사람과 같다는 근거가 없다 — 프로필에 섞지 않는다.

## 2단계. 초안에 독자를 태워보기

원문 확보는 우선순위가 있다.

1. 사용자가 붙여넣은 초안.
2. 편집기에 열려 있으면 `editor_read` · `editor_read_structure`.
3. 이미 발행한 글이면 `my_content_info` 로 특정하고 `my_content_read` ·
   `my_content_detail` 로 읽는다.

셋 다 없으면 점검할 원문이 없다 — 붙여넣어 달라고 하고 멈춘다.

주제와 핵심 키워드로 `kin_question_demand` · `search_keywords` · `autocomplete_keywords` 를
확인해 **실제로 이 주제에서 사람들이 묻는 질문과 표현**을 모은다. "독자가 궁금해할 것"의
유일한 근거는 이것이다 — 지어내지 않는다.

대조는 두 갈래다.

- **내용** — 확인한 질문 목록과 초안을 대조해 답이 있는 질문 / 없는 질문 / 부분적인 질문을
  표시한다.
- **형식** — 프로필의 측정값(기기 비중·재방문율·유입 경로)에 딸린 일반 원칙만 적용한다.
  예: 모바일 비중이 높으면 긴 미분단 문단을 짚는다. 이건 "이 독자층의 취향"이 아니라 기기
  사실에 딸린 일반 가독성 원칙이다 — 프로필에 기기 값이 없으면 이 갈래를 건너뛴다.

형식은 `references/checklist-format.md`.

## 시뮬레이션은 증거가 아니다

이 점검은 실제 독자를 인터뷰한 게 아니다. 산출물에서 반드시 지킨다.

- 1인칭으로 독자인 척 말하지 않는다. "저는 이게 궁금해요" 금지 — "~라는 질문이 남을 수
  있다"처럼 3인칭 가정형으로 쓴다.
- 이름·나이·직업을 지어내 붙인 가상 인물을 만들지 않는다. 프로필은 집계이지 사람이 아니다.
- 클릭률·전환율·만족도·"이 글이 잘 될 것이다" 같은 예측을 하지 않는다.
- 결과를 "독자 반응"이나 "검증 결과"라고 부르지 않는다. **초안이 실제 질문에 답했는지
  점검한 목록**이라고만 부른다.

## 이 스킬이 하지 않는 것

- 경력·수상·소속을 지어내 전문가를 연기하지 않는다 — 독자를 다루지 화자를 연기하지 않는다.
- 성별·세대에 고정관념을 얹은 해석을 하지 않는다. 분포를 안다고 취향이나 동기를 아는 것이
  아니다.
- 원고를 고쳐 쓰지 않는다. 무엇이 빠졌는지만 표시한다 — 채우는 건 사용자 몫이다.
- 이 블로그의 문체는 분석하지 않고(그건 다른 스킬의 일), 다음에 뭘 쓸지도 추천하지 않는다.
