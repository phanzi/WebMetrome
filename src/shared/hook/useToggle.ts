import type { Dispatch, SetStateAction } from "react";

export function useToggle(
  stateReturn: [boolean, Dispatch<SetStateAction<boolean>>],
) {
  const [value, setValue] = stateReturn;

  const toggle = () => {
    setValue((prev) => !prev);
  };

  return [value, toggle] as const;
}
