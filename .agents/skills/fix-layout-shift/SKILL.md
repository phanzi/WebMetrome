---
name: fix-layout-shift
description: loading.tsx와 로드 후 page/view 간 CLS(layout shift) 정적 일관성 검사
metadata:
  author: cursor-agent
---

# Fix Layout Shift (CLS) - 정적 UI 일관성 검사

`loading.tsx`(로딩 fallback)와 로드 후의 `page.tsx`/`view.tsx` 사이에서 **layout shift가 없도록** 레이아웃·구조·치수를 맞췄는지 정적으로 점검합니다.

## 입력

다음 중 하나를 지정합니다.

- 단일 파일: `src/app/**/loading.tsx` 또는 `src/app/**/view.tsx` 또는 `src/app/**/page.tsx`
- 경로 패턴: `src/app/**/loading.tsx`

## 동작 방식 (정적 분석)

1. **페어 찾기**: 같은 폴더(또는 같은 경로의 Suspense boundary)에서 대응되는 `view.tsx` 또는 `page.tsx`를 찾습니다.
2. **스켈레톤-콘텐츠 매칭**: 최상위 래퍼(폼/카드/컨테이너) → 필드 섹션(`FieldGroup/FieldSet`) → 입력(addon 포함) → 하단 버튼 영역 순으로 “자리”를 맞춥니다.
3. **치수 토큰 비교**: 로드 후와 동일한 레이아웃 토큰이 로딩에서도 존재하는지 확인합니다.
   - 폭/높이: `w-*`, `min-h-*`, `h-*`
   - 간격/패딩: `p-*`, `px-*`, `py-*`, `gap-*`
   - 그리드: `grid-cols-*`
   - 테두리/라운드: `rounded-*`, `border*`
4. **누락/조건부 분기 점검**: 로드 후에만 존재하는 섹션(예: reserve 블록, textarea addon 버튼 영역, 정보 카드/스위치 등)이 로딩 중 누락되면 BAD로 판단합니다. 또한 조건부 렌더링의 경우 “초기 분기”와 동일한 높이 placeholder로 안정화했는지 확인합니다.
5. **정적 우선 검토**: `loading.tsx`에 불필요한 훅이 들어가 레이아웃/조건이 달라지는지(또는 placeholder를 만들기 위해 필요한 최소한의 변경인지) 확인합니다.

## 출력 형식

각 이슈는 아래처럼 제시합니다.

- `BAD:` 무엇이 왜 달라져서 layout shift 위험이 있는지
- `GOOD:` 로드 후와 맞추기 위해 무엇을 추가/수정해야 하는지 (구체적인 컴포넌트/클래스 단위)

추가로, 마지막에 `추천 변경 범위`를 짧게 요약합니다.

## 적용 시 예시

- `loading.tsx`에 없던 `FieldSet(예약)`을 `disabled` 상태로라도 추가해 높이 점프를 줄이기
- textarea 아래 `InputGroupAddon` 버튼(특수문자/이름추가)을 로딩 중에도 같은 위치/높이로 렌더링하기
- `h-60`/`min-h-60!` 같은 높이 토큰을 로드 후와 동일하게 유지하기
