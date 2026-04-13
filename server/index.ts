import { staticPlugin } from "@elysiajs/static";
import { Elysia } from "elysia";
import { join } from "node:path";
import { app } from "./app";

const isDev = process.env.APP_ENV === "development";
const PORT = 4000;

const server = new Elysia().use(app);

if (isDev) {
  const VITE_DEV_ORIGIN = "http://localhost:3000";
  const VITE_DEV_PROTOCOL = "http";
  const VITE_DEV_HOST = "localhost:3000";

  server.all("*", async ({ request }) => {
    const url = new URL(request.url);
    url.protocol = VITE_DEV_PROTOCOL;
    url.host = VITE_DEV_HOST;

    return fetch(url.toString(), request);
  });

  console.log(`📎 개발 프록시 대상(Vite): ${VITE_DEV_ORIGIN}`);
} else {
  const STATIC_ROOT = join("out", "dist");

  server.use(
    await staticPlugin({
      assets: STATIC_ROOT,
      prefix: "/",
      indexHTML: true,
    }),
  );

  console.log(`📁 정적 파일: ${STATIC_ROOT}`);
}

server.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
