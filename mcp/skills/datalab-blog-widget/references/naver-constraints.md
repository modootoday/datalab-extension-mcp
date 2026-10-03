# 네이버 블로그 HTML 제약

네이버가 정책을 바꿨을 수 있다 — 이 문서와 실제 에디터의 반응이 다르면 에디터 쪽을 믿는다.

## 허용 태그

`span` `br` `hr` `img` `a` — 이 다섯만. `div` · `p` · `h1`~`h6` · `ul` · `ol` · `li` ·
`table` · `form` · `input` · `button` · `iframe` · 스크립트 · `style` · `link` 전부 막힌다.

## 필수 속성

- 링크: `href` 와 `target="_top"` (`_blank` 나 생략은 깨진다)
- 이미지: `src` 와 `alt`

## 크기

- 위젯(사이드바): 폭 170px 고정, 최대 높이 600px, 최대 2,000바이트(UTF-8)
- 프로필·섹션(본문): 폭 고정 없음, `max-width:960px` 만

## 금지

- `<style>` · `<link>` · class 속성 — 스타일은 반드시 인라인 `style` 속성으로
- 모든 이벤트 핸들러, `javascript:` 스킴, CSS `expression(`, `@import`
- `position:fixed`
- 링크 안에 링크 중첩

## 구조 대체표

| 원래 태그 | 대체                                          |
| --------- | --------------------------------------------- |
| `div`     | `span` + `display:block`                      |
| `p`       | margin 준 block span                          |
| `h1`~`h6` | font-size·weight 준 span                      |
| `ul`·`li` | "• " 접두 block span                          |
| `table`   | `display:grid` 또는 `display:table` span 조합 |
| `button`  | `target="_top"` 링크에 스타일                 |

## 바이트 절약

- 색상 6자리를 3자리로 (`#ffffff` → `#fff`)
- `0px` · `0em` → `0`
- margin·padding 개별 지정 대신 결합 (`margin:10px 0`)
- font 관련 속성을 `font:` 단축형으로
- 콜론·세미콜론 주변 공백 제거

넘치면 이 순서로 뺀다: 장식(그림자·모서리) → 전환효과 → 보조 색상 → 폰트 변형 → 간격.

## 인코딩 비용

ASCII 1바이트, 한글 3바이트, 이모지 4바이트 — 본문에 한글이 많으면 2,000바이트가 금방
찬다. 이모지는 문자 그대로 쓰지 말고 엔티티로.
