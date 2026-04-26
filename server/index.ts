import { Elysia } from "elysia";
import { z } from "zod";
import { createApp } from "./app";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z
    .url()
    .default("http://localhost:3000")
    .transform((value) => new URL(value)),
});

if (import.meta.main) {
  const env = envSchema.parse(process.env);
  const server = new Elysia() //
    .use(createApp())
    .all("*", async ({ request }) => {
      const url = new URL(request.url);
      url.protocol = env.WEB_ORIGIN.protocol;
      url.host = env.WEB_ORIGIN.host;
      return fetch(url.toString(), request);
    });

  server.listen(env.PORT, () => {
    console.log(`🚀 서버 실행 중: http://localhost:${env.PORT}`);
  });
}
