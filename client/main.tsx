import { RouterProvider, createRouter } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";
import "./index.css";
import { routeTree } from "./routeTree.gen";

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.log(
    "아래의 에러는 index.html 파일에 <div id='root'></div> 태그가 없어서 발생하는 에러입니다.",
  );
  throw new Error("Failed to find the root element");
}

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

if (!rootElement.innerHTML) {
  const root = createRoot(rootElement);
  root.render(<RouterProvider router={router} />);
}
