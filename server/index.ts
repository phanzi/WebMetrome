import { staticPlugin } from "@elysiajs/static";
import { Elysia } from "elysia";
import { join } from "node:path";
import { createApp } from "./app";

export const resolvePort = (portCandidate: string | undefined): number => {
  const parsed = Number.parseInt(portCandidate ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4000;
};

export async function buildServer(isDev: boolean) {
  const server = new Elysia().use(createApp());

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
    return server;
  }

  const STATIC_ROOT = join("out", "dist");
  server.use(
    await staticPlugin({
      assets: STATIC_ROOT,
      prefix: "/",
      indexHTML: true,
    }),
  );
  console.log(`📁 정적 파일: ${STATIC_ROOT}`);
  return server;
}

if (import.meta.main) {
  const isDev = process.env.APP_ENV === "development";
  const PORT = resolvePort(process.env.PORT);
  const server = await buildServer(isDev);

  server.listen(PORT, () => {
    console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
  });
}
