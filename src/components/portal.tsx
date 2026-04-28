import { PropsWithChildren, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function Portal(props: PropsWithChildren) {
  const { children } = props;
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return createPortal(children, document.getElementById("portal-exit")!);
}
