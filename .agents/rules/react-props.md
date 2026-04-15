---
description: React 컴포넌트 props 정의·파라미터·타입 네이밍 규칙
globs: **/*.tsx
alwaysApply: false
---

# React Component Props Convention

React 컴포넌트의 props 전달·구조 분해·타입 정의 방식을 통일한다.

## 규칙

### 1. 구조 분해 위치

props는 **함수 파라미터에서 spread 하지 않고**, 컴포넌트 **첫 번째 라인에서 destructure** 한다.

```tsx
// ❌ BAD - 파라미터에서 destructure
export function CouponSelector({ coupons, children }: Props) {
  return <div>{/* ... */}</div>;
}
```

```tsx
// ✅ GOOD - 컴포넌트 첫 줄에서 destructure
export function CouponSelector(props: Props) {
  const { coupons, children } = props;
  return <div>{/* ... */}</div>;
}
```

### 2. 파라미터 이름

컴포넌트 props의 파라미터 이름은 항상 **`props`** 를 사용한다.

```tsx
// ❌ BAD - p, componentProps 등 다른 이름
export function CouponSelector(p: Props) {
  const { coupons, children } = p;
  // ...
}

export function CouponForm(componentProps: Props) {
  const { onSubmit } = componentProps;
  // ...
}
```

```tsx
// ✅ GOOD
export function CouponSelector(props: Props) {
  const { coupons, children } = props;
  // ...
}

export function CouponForm(props: Props) {
  const { onSubmit } = props;
  // ...
}
```

### 3. ReactNode 전달 시

`children` 등 ReactNode를 props로 받을 때는 **`PropsWithChildren`** 타입을 사용한다.

```tsx
// ❌ BAD - children을 수동으로 타입에 추가
type Props = {
  coupons: Coupon[];
  children: ReactNode;
};
```

```tsx
// ✅ GOOD
import type { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  coupons: Coupon[];
}>;
```

### 4. Props 타입 위치

props 타입은 **컴포넌트 바로 위 바깥**에 정의하고, 함수 파라미터에 inline으로 쓰지 않는다.

```tsx
// ❌ BAD - 파라미터에 inline 타입
export function CouponSelector(props: {
  coupons: Coupon[];
  children: ReactNode;
}) {
  const { coupons, children } = props;
  // ...
}
```

```tsx
// ✅ GOOD - 컴포넌트 바로 위에 타입 정의
type Props = PropsWithChildren<{
  coupons: Coupon[];
}>;

export function CouponSelector(props: Props) {
  const { coupons, children } = props;
  // ...
}
```

### 5. Props 타입 이름

props 타입 이름은 항상 **`Props`** 를 사용한다. 한 파일에 여러 컴포넌트가 있어 `Props`가 겹칠 수 있으면 **`{컴포넌트이름}Props`** 로 명명한다.

```tsx
// ❌ BAD - 단일 컴포넌트인데 ComponentProps 등 다른 이름
type CouponSelectorComponentProps = PropsWithChildren<{ coupons: Coupon[] }>;
export function CouponSelector(props: CouponSelectorComponentProps) {
  // ...
}
```

```tsx
// ✅ GOOD - 단일 컴포넌트는 Props
type Props = PropsWithChildren<{
  coupons: Coupon[];
}>;
export function CouponSelector(props: Props) {
  const { coupons, children } = props;
  // ...
}
```

```tsx
// ❌ BAD - 여러 컴포넌트인데 둘 다 Props (이름 충돌)
type Props = PropsWithChildren<{ coupons: Coupon[] }>;
export function CouponSelector(props: Props) {
  /* ... */
}

type Props = { onSubmit: () => void }; // 재선언 불가
export function CouponForm(props: Props) {
  /* ... */
}
```

```tsx
// ✅ GOOD - 여러 컴포넌트일 때 {컴포넌트이름}Props
type CouponSelectorProps = PropsWithChildren<{ coupons: Coupon[] }>;
export function CouponSelector(props: CouponSelectorProps) {
  const { coupons, children } = props;
  // ...
}

type CouponFormProps = { onSubmit: () => void };
export function CouponForm(props: CouponFormProps) {
  const { onSubmit } = props;
  // ...
}
```
