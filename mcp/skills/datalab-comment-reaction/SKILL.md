---
name: datalab-comment-reaction
description: 네이버 뉴스 댓글의 작성량·참여자·시간대·성별연령·기기·지역·분야 분포를 점검한다. "댓글 반응이 커졌나", "누가 언제 참여하나", "어느 분야로 퍼졌나" 요청에 사용한다. 댓글 통계를 전체 여론이나 감성으로 확대하지 않는다.
license: Proprietary
metadata:
  surfaces: both
  install: optional
  tools: comment_trend, comment_user_trend, comment_genderage, comment_hourly, comment_device, comment_country, comment_category_spread
---

## MCP 도구 연결

요청에 필요한 실제 도구가 현재 목록에 직접 보이면 그 도구를 사용한다. 보이지 않으면
사용자의 원래 의도를 `datalab_find_tools`에 보내고, 반환된 스키마와 도구 이름만 사용해
`datalab_call`로 실행한다. 도구 이름이나 인자를 지어내지 않는다. 결과가
`awaiting_confirm`이면 원래 호출을 반복하지 말고 ticket을 `datalab_confirm_status`로
확인한다.


# 뉴스 댓글 반응 점검

댓글량과 참여자 수를 먼저 보고, 구성 분해는 질문에 필요한 범위만 추가한다.

## 절차

1. 기준 날짜와 뉴스 분야를 확인한다. 없으면 전체 분야의 최신 제공 기간을 본다고 밝힌다.
2. `comment_trend`와 `comment_user_trend`로 댓글량과 참여자 수가 함께 변했는지 확인한다.
3. 활동 시간 질문에는 `comment_hourly`, 참여 구성 질문에는 `comment_genderage`를 사용한다.
4. 접근 환경이나 확산 범위가 필요할 때만 `comment_device`, `comment_country`, `comment_category_spread`를 추가한다.
5. 결과를 "활동량", "참여 구성", "해석 한계"로 나누고 적용된 날짜와 분야를 함께 적는다.

## 경계

- 댓글 작성자 통계를 전체 국민이나 뉴스 독자 전체의 여론으로 일반화하지 않는다.
- 댓글 본문을 읽지 않았으므로 찬반, 감성, 주장 내용을 지어내지 않는다.
- 댓글 수 증가와 작성자 수 증가를 같은 현상으로 취급하지 않는다.
- 누락되거나 제공되지 않은 값을 0으로 바꾸지 않는다.
