---
description: React import 패턴 - import * as React 금지, named import 사용
globs: **/*.ts,**/*.tsx
alwaysApply: false
---
# React Import Conventions

`import * as React from "react"` 구문을 사용하지 않는다.

## 규칙

1. **타입 사용 시**: `React.ReactNode`, `React.ComponentProps` 등 React 하위 타입은 named type import로 사용한다.
   - `import type { ReactNode } from "react"` 후 `ReactNode` 사용
   - `import type { ComponentProps } from "react"` 후 `ComponentProps` 사용

2. **훅/함수 사용 시**: `React.useState`, `React.useEffect` 등은 named import로 사용한다.
   - `import { useState, useEffect } from "react"` 후 `useState`, `useEffect` 사용

## 예시

```typescript
// ❌ BAD
import * as React from "react";

function Example() {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {}, []);
  return <div>{count}</div>;
}

type Props = {
  children: React.ReactNode;
};
```

```typescript
// ✅ GOOD
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

function Example() {
  const [count, setCount] = useState(0);
  useEffect(() => {}, []);
  return <div>{count}</div>;
}

type Props = {
  children: ReactNode;
};
```

```typescript
// ✅ GOOD - ComponentProps
import type { ComponentProps } from "react";

function Button(props: ComponentProps<"button">) {
  return <button {...props} />;
}
```
