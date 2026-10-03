# 기준 템플릿

전부 `references/naver-constraints.md` 의 다섯 태그 규칙을 지킨다. `[ ]` 는 자리표시자다.

## 위젯 — 프로필 카드 (170px)

```html
<span style="width:170px;font:11px -apple-system,sans-serif">
  <span
    style="background:#fff;border:1px solid #ddd;border-radius:6px;padding:12px;text-align:center;display:block"
  >
    <span
      style="width:48px;height:48px;margin:0 auto 8px;border-radius:50%;overflow:hidden;display:block"
      ><img
        src="[이미지URL]"
        style="width:100%;height:100%;object-fit:cover"
        alt="프로필"
    /></span>
    <span style="font-weight:600;font-size:12px;display:block">[이름]</span>
    <span style="color:#666;font-size:10px;display:block">[한줄소개]</span>
  </span>
</span>
```

## 위젯 — 방문자 카운터 (170px)

숫자는 실제 값을 가져왔을 때만 채우고 기준 날짜를 붙인다. 아니면 `0000`.

```html
<span style="width:170px;font:11px -apple-system,sans-serif">
  <span
    style="background:#03c75a;color:#fff;padding:16px;border-radius:6px;text-align:center;display:block"
  >
    <span style="font-size:24px;font-weight:700;display:block">[0000]</span>
    <span style="font-size:10px;opacity:.9;display:block"
      >오늘 방문자 · [기준일]</span
    >
  </span>
</span>
```

## 위젯 — 최근 게시물 (170px)

실제 게시물 URL을 모르면 `href="#"` 로 두고 사용자에게 채워달라고 말한다.

```html
<span style="width:170px;font:11px -apple-system,sans-serif">
  <span
    style="background:#fff;border:1px solid #ddd;border-radius:6px;padding:10px;display:block"
  >
    <span style="font-weight:600;color:#03c75a;font-size:12px;display:block"
      >최근 게시물</span
    >
    <span style="display:block;padding:6px 0;border-bottom:1px solid #f0f0f0">
      <a
        href="[게시물URL]"
        target="_top"
        style="display:block;color:#333;text-decoration:none;font-size:10px"
        >[제목]</a
      >
      <span style="color:#888;font-size:9px;display:block">[날짜]</span>
    </span>
  </span>
</span>
```

## 위젯·카테고리 — 메뉴 목록 (170px)

hover 효과 없음(구현 불가). 정적 스타일만.

```html
<span style="width:170px;font:11px -apple-system,sans-serif">
  <span
    style="background:#fff;border:1px solid #ddd;border-radius:6px;padding:10px;display:block"
  >
    <span style="font-weight:600;color:#03c75a;font-size:12px;display:block"
      >카테고리</span
    >
    <a
      href="[URL]"
      target="_top"
      style="display:block;padding:6px 8px;color:#333;text-decoration:none;font-size:10px;border-bottom:1px solid #f0f0f0"
      >[카테고리명] ([0000])</a
    >
  </span>
</span>
```

## 프로필 섹션 (본문)

```html
<span style="display:block;max-width:960px;margin:0 auto;padding:20px">
  <span
    style="display:block;text-align:center;padding:40px 20px;background:#f8f9fa;border-radius:12px"
  >
    <span
      style="width:120px;height:120px;margin:0 auto 20px;border-radius:50%;overflow:hidden;display:block"
      ><img
        src="[이미지URL]"
        style="width:100%;height:100%;object-fit:cover"
        alt="프로필"
    /></span>
    <span style="font:700 24px sans-serif;display:block">[이름]</span>
    <span style="color:#666;display:block">[한줄소개]</span>
  </span>
</span>
```

## 게시물 목록 (겸용)

```html
<span style="display:block;max-height:400px;overflow-y:auto">
  <span style="display:block;padding:8px 0;border-bottom:1px solid #f0f0f0">
    <a
      href="[게시물URL]"
      target="_top"
      style="display:block;color:#333;text-decoration:none"
      >[제목]</a
    >
    <span style="color:#888;font-size:11px;display:block">[날짜]</span>
  </span>
</span>
```
