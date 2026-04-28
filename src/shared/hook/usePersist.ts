import type { Dispatch, SetStateAction } from "react";
import { useEffect } from "react";

export function usePersist<S>(
  key: string,
  stateReturn: [S, Dispatch<SetStateAction<S>>],
) {
  const [value, setValue] = stateReturn;

  useEffect(() => {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        const parsed = JSON.parse(value) as { value: S };
        setValue(parsed.value);
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify({ value }));
  }, [value]);

  return [value, setValue] as const;
}
