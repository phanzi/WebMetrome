import type { PropsWithChildren } from "react";
import { useEffect, useRef } from "react";

export function InjectSwapActive(props: PropsWithChildren) {
  const { children } = props;

  const timer = useRef<NodeJS.Timeout>(undefined);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

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
      }, 1000);
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
