---
description: React 컴포넌트에서 onClick, onChange 등 콜백은 화살표 함수로 정의
globs: **/*.tsx
alwaysApply: false
---

# React 콜백 화살표 함수 규칙

React 컴포넌트를 만들거나 수정할 때, 또는 컴포넌트 구현을 확인할 때 **onClick, onChange** 등 콜백에 넘기는 함수는 **화살표 함수(arrow function)** 로 정의한다.

## 적용 대상

- `onClick`, `onChange`, `onSubmit`, `onBlur`, `onFocus`, `onKeyDown` 등 이벤트/콜백 prop
- JSX 내부에서 직접 넘기는 인라인 핸들러

## 규칙

- 콜백으로 사용되는 함수는 화살표 함수로 작성한다.
- `function` 키워드로 정의한 함수를 콜백으로 넘기지 않는다.

## 예시

```tsx
// ❌ BAD - function 키워드
<button onClick={function handleClick() { doSomething(); }}>클릭</button>
<Input onChange={function handleChange(e) { setValue(e.target.value); }} />

// ❌ BAD - 선언 후 참조 (일반 function 선언)
function handleClick() { doSomething(); }
<button onClick={handleClick}>클릭</button>

// ✅ GOOD - 화살표 함수
<button onClick={() => doSomething()}>클릭</button>
<Input onChange={(e) => setValue(e.target.value)} />

// ✅ GOOD - 화살표 함수로 정의 후 참조
const handleClick = () => doSomething();
<button onClick={handleClick}>클릭</button>

const handleChange = (e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value);
<Input onChange={handleChange} />
```

## 요약

- 콜백/이벤트 핸들러는 **항상 화살표 함수**로 정의 (`() => {}` 또는 `(e) => {}`).
- 인라인이든, 변수에 담아 쓰든 **화살표 함수**를 사용한다.
