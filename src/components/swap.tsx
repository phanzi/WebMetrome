import type { PropsWithChildren } from "react";
import { useEffect, useRef } from "react";

type Props = PropsWithChildren<{
  afterMs?: number;
}>;

export function SwapReturn(props: Props) {
  const { children, afterMs = 1000 } = props;

  const timer = useRef<NodeJS.Timeout>(undefined);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    element.addEventListener("click", () => {
      if (!element.classList.contains("swap-active")) {
        element.classList.add("swap-active");
      }
      if (timer.current) {
        clearTimeout(timer.current);
      }
      timer.current = setTimeout(() => {
        element.classList.remove("swap-active");
        timer.current = undefined;
      }, afterMs);
    });
  }, []);

  return (
    <>
      {{
        ...(children as unsafe_any),
        props: { ...(children as unsafe_any).props, ref },
      }}
    </>
  );
}
