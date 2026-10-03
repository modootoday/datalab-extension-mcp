---
name: datalab-pumasi
description: 네이버 블로그 품앗이 대상의 공감·이웃 상태와 반응자를 실제 계정으로 확인한다. "공감했나 확인", "이웃 상태", "누가 반응했나" 요청에 사용한다. 댓글 작성·이웃 신청·취소·제출은 하지 않고 초안이 필요하면 답변에만 작성한다.
license: Proprietary
metadata:
  surfaces: both
  install: optional
  tools: pumasi_like_state, pumasi_neighbor_state, pumasi_reactors, pumasi_commenters
---

## MCP 도구 연결

요청에 필요한 실제 도구가 현재 목록에 직접 보이면 그 도구를 사용한다. 보이지 않으면
사용자의 원래 의도를 `datalab_find_tools`에 보내고, 반환된 스키마와 도구 이름만 사용해
`datalab_call`로 실행한다. 도구 이름이나 인자를 지어내지 않는다. 결과가
`awaiting_confirm`이면 원래 호출을 반복하지 말고 ticket을 `datalab_confirm_status`로
확인한다.


# 품앗이 상태 확인

품앗이 대상의 현재 상태를 읽고, 확인한 사실과 다음 행동 제안을 분리한다.

## 절차

1. 대상 글이나 블로그가 어느 것인지 확인한다. 여러 후보가 있으면 임의로 고르지 않는다.
2. 공감 여부는 `pumasi_like_state`, 이웃 관계는 `pumasi_neighbor_state`로 확인한다.
3. 반응자 목록이 필요할 때만 `pumasi_reactors` 또는 `pumasi_commenters`를 사용한다.
4. 결과를 "확인된 상태", "확인하지 못한 항목", "제안"으로 나눠 쓴다.

## 경계

- 상태를 읽는 네 도구만 사용한다. 댓글창 열기, 댓글 초안 입력, 이웃 신청·취소·제출은 하지 않는다.
- 댓글 문구를 요청받으면 답변에 텍스트로만 만들고 브라우저에는 넣지 않는다.
- 누락된 응답을 없음으로 쓰지 않는다. 시점이 중요하면 상태를 다시 확인한다.
- 상대의 의도나 관계를 지어내지 않는다.
