import { useRef } from "react";
import { atom, toPersisted, useAtom } from "./useAtom";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const atomRef = useRef(toPersisted(key, atom(initialValue)));
  // eslint-disable-next-line react-hooks/refs
  const [value, setValue] = useAtom(atomRef.current);

  return [value, setValue] as const;
}
