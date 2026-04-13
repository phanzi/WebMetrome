import { createServer } from "node:net";
import { z } from "zod";
import { createApp } from "../../server/app";

const serverAddressSchema = z.object({
  port: z.number().int().positive(),
});

const getFreePort = async (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, () => {
      const address = server.address();
      const parsedAddress = serverAddressSchema.safeParse(address);
      if (!parsedAddress.success) {
        reject(new Error("Unable to resolve test port"));
        return;
      }
      const { port } = parsedAddress.data;
      server.close(() => {
        resolve(port);
      });
    });
    server.on("error", reject);
  });

export const startTestServer = async () => {
  const port = await getFreePort();
  const app = createApp();
  app.listen(port);

  return {
    port,
    stop: () => {
      app.stop();
    },
  };
};
