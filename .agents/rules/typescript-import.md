---
description: TypeScript import - value와 type import를 한 구문에 섞지 않고 구문 분리
globs: **/*.ts,**/*.tsx
alwaysApply: false
---

# ts-import: Value / Type Import 분리

named value import와 named type import를 **같은 import 문**에 쓰지 않는다. value용 import와 type용 import는 **서로 분리된 import 구문**으로 작성한다.

## 규칙

1. **한 모듈에서 value와 type을 모두 가져올 때**: `import foo, { type Bar } from "module"`처럼 한 줄에 섞지 말고, value용 `import`와 type용 `import type`을 각각 별도 줄로 쓴다.
2. **type만 필요할 때**: `import type { T } from "module"` 사용.
3. **value만 필요할 때**: `import { a, b } from "module"` 또는 default `import x from "module"` 사용.

## 예시

```typescript
// ❌ BAD - value와 type을 한 구문에 혼합
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react";
```

```typescript
// ✅ GOOD - value import와 type import 구문 분리
import useEmblaCarousel from "embla-carousel-react";
import type { UseEmblaCarouselType } from "embla-carousel-react";
```

```typescript
// ✅ GOOD - React 예시
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ComponentProps, KeyboardEvent } from "react";
```
