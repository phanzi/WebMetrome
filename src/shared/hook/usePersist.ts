import type { Dispatch, SetStateAction } from "react";
import { useEffect } from "react";

export function usePersist<S>(
  key: string,
  stateReturn: [S, Dispatch<SetStateAction<S>>],
) {
  const [value, setValue] = stateReturn;

  useEffect(() => {
    const itemValue = localStorage.getItem(key);
    if (itemValue) {
      try {
        const parsed = JSON.parse(itemValue) as { value: S };
        setValue(parsed.value || value);
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify({ value }));
  }, [value]);

  return [value, setValue] as const;
}
