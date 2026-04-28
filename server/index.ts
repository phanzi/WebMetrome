import { staticPlugin } from "@elysiajs/static";
import Elysia from "elysia";
import { z } from "zod";
import { createApp } from "../server/app";

const env = z
  .object({
    PORT: z.coerce.number().int().positive().default(4000),
  })
  .parse(process.env);

const server = new Elysia().use(createApp());

if (process.env.__PROD__) {
  const { default: handler } = await import("./entry");

  server
    .use(
      staticPlugin({
        assets: "dist/client",
        prefix: "/",
        alwaysStatic: true,
      }),
    )
    .all("*", ({ request }) => handler.fetch(request));
} else {
  const devOrigin = new URL("http://localhost:3000");

  server.all("*", ({ request }) => {
    const url = new URL(request.url);
    url.protocol = devOrigin.protocol;
    url.host = devOrigin.host;

    return fetch(
      new Proxy(request, {
        get: (target, prop) => {
          if (prop === "url") return url.toString();
          return Reflect.get(target, prop);
        },
      }),
    );
  });
}

server.listen(env.PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${env.PORT}`);
});
