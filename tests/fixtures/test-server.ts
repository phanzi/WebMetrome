import { createServer } from "node:net";
import { createApp } from "../../server/app";

const getFreePort = async (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Unable to resolve test port"));
        return;
      }
      const { port } = address;
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
