import { createRoot } from "react-dom/client";
import App from "./App.js";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.log(
    "아래의 에러는 index.html 파일에 <div id='root'></div> 태그가 없어서 발생하는 에러입니다.",
  );
  throw new Error("Failed to find the root element");
}

createRoot(rootElement).render(<App />);
