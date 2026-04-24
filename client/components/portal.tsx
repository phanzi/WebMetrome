import { PropsWithChildren } from "react";
import { createPortal } from "react-dom";

const portalExitElement = document.getElementById("portal-exit") as HTMLElement;

export function Portal(props: PropsWithChildren) {
  const { children } = props;
  return createPortal(children, portalExitElement);
}
