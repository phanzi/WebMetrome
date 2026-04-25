import { Elysia } from "elysia";
import { z } from "zod";
import { createApp } from "./app";

const portSchema = z
  .string()
  .transform((value) => Number.parseInt(value, 10))
  .pipe(z.number().int().positive());

export const resolvePort = (portCandidate: string | undefined): number => {
  const parsed = portSchema.safeParse(portCandidate ?? "");
  return parsed.success ? parsed.data : 4000;
};

const resolveWebOrigin = (origin: string | undefined) => {
  const parsed = z.url().safeParse(origin);
  if (!parsed.success) {
    throw new Error("WEB_ORIGIN is required and must be a valid URL");
  }
  return new URL(parsed.data);
};

export async function buildServer() {
  const webOrigin = resolveWebOrigin(process.env.WEB_ORIGIN);
  const WEB_PROTOCOL = webOrigin.protocol.replace(":", "");
  const WEB_HOST = webOrigin.host;
  const server = new Elysia().use(createApp());

  server.all("*", async ({ request }) => {
    const url = new URL(request.url);
    url.protocol = WEB_PROTOCOL;
    url.host = WEB_HOST;
    return fetch(url.toString(), request);
  });

  console.log(`📎 웹 프록시 대상: ${webOrigin.origin}`);

  return server;
}

if (import.meta.main) {
  const PORT = resolvePort(process.env.PORT);
  const server = await buildServer();

  server.listen(PORT, () => {
    console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
  });
}
