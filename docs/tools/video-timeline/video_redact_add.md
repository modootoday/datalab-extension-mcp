---
layout: "dl-tool"
title: "영상 편집기 — 모자이크·흐림으로 가리기"
description: "얼굴·번호판처럼 가릴 곳에 모자이크나 흐림 영역을 한 장면 위에 얹는다. 영역은 그 아래에 그려진 화면(사진·영상·요소)을 가리고 미리보기와 내보내기에 같게 나온다. 시각은 모두 타임라인 ms 이고 그 장면 안이어야 한다. start_ms·end_ms 를 주면 그 사이에만 보이고, 생략하면 장면 내내 보인다. 움직이는 대상은 keyframes(2개 이상, at_ms 오름차순)로 따라가며 키프레임 사이는 직선으로 옮기고 처음 앞·마지막 뒤는 그 자리에 둔다. 결과 ref 는 r- 로 시작하고, 위치·크기·mode·strength 는 video_node_update 로 바꾸며 video_timeline_get 의 장면 nodes 에서 확인한다. 한 번 호출이 되돌리기 한 단계다."
nav: "tools"
tool: "video_redact_add"
generated: true
---

# 영상 편집기 — 모자이크·흐림으로 가리기

`video_redact_add` · 매번 물어봄 · 내 컴퓨터

얼굴·번호판처럼 가릴 곳에 모자이크나 흐림 영역을 한 장면 위에 얹는다. 영역은 그 아래에 그려진 화면(사진·영상·요소)을 가리고 미리보기와 내보내기에 같게 나온다. 시각은 모두 타임라인 ms 이고 그 장면 안이어야 한다. start_ms·end_ms 를 주면 그 사이에만 보이고, 생략하면 장면 내내 보인다. 움직이는 대상은 keyframes(2개 이상, at_ms 오름차순)로 따라가며 키프레임 사이는 직선으로 옮기고 처음 앞·마지막 뒤는 그 자리에 둔다. 결과 ref 는 r- 로 시작하고, 위치·크기·mode·strength 는 video_node_update 로 바꾸며 video_timeline_get 의 장면 nodes 에서 확인한다. 한 번 호출이 되돌리기 한 단계다.

## AI가 넘기는 값

| 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- |
| `scene` | 문자열 | X | video_timeline_get 이 준 장면 ref. 생략하면 start_ms(없으면 첫 키프레임 at_ms)가 든 장면 |
| `x` | 숫자 | O | 영역 왼쪽 위 x(px) |
| `y` | 숫자 | O | 영역 왼쪽 위 y(px) |
| `width` | 숫자 | O | 영역 가로 크기(px) |
| `height` | 숫자 | O | 영역 세로 크기(px) |
| `mode` | 문자열 | X | mosaic=네모 칸으로 뭉갬, blur=흐리게. 생략 시 mosaic |
| `strength` | 숫자 | X | 세기, 캔버스 짧은 변 대비 비율. mosaic 은 칸 크기 0.01~0.08(기본 0.03), blur 는 흐림 반경 0.005~0.05(기본 0.02). 생략 시 mode 의 기본값 |
| `keyframes` | 목록 | X | 움직이는 영역(타임라인 ms 와 그 시각의 px 상자). 주면 x·y·width·height 대신 이 값으로 그린다 |
| `start_ms` | 정수 | X | 보이기 시작하는 타임라인 ms. 생략 시 장면 시작 |
| `end_ms` | 정수 | X | 사라지는 타임라인 ms(이 시각부터 안 보임). 생략 시 장면 끝 |
| `editor_session` | 문자열 | X | video_project_get/new/open 응답의 editorSession |
| `expected_project` | 문자열 | X | 호출 대상 projectRef. 현재 대상과 다르면 실행하지 않는다 |
| `expected_revision` | 정수 | X | 마지막으로 읽은 revision. 현재 값과 다르면 실행하지 않는다 |
| `expected_document_hash` | 문자열 | X | 마지막으로 읽은 documentHash. 지금 문서 내용이 다르면 실행하지 않고 stale-target(documentHash)으로 멈춘다. revision 과 달리 새로고침 뒤에도 그대로 쓸 수 있다 |

## 함께 쓰는 도구

- [영상 편집기 — 요소 고치기](/tools/video-editor/video_node_update/) `video_node_update`
- [영상 편집기 — 타임라인 확인](/tools/video-editor/video_timeline_get/) `video_timeline_get`
- [영상 편집기 — 자막 서식 바꾸기](/tools/video-timeline/video_subtitle_style_set/) `video_subtitle_style_set`
- [영상 편집기 — 장면 자르기](/tools/video-timeline/video_scene_split/) `video_scene_split`

이 페이지는 도구 정의에서 자동으로 만들어져요. 연결 프로그램 1.18.2 기준.
