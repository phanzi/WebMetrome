import { delay } from "es-toolkit";
import { pullAt } from "es-toolkit/compat";
import type { ZodType } from "zod";

type QueuedWebSocket = WebSocket & {
  __queuedMessages?: string[];
};

export const connectWebSocket = (url: string): Promise<WebSocket> =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(url) as QueuedWebSocket;
    ws.__queuedMessages = [];

    ws.addEventListener("message", (event) => {
      ws.__queuedMessages?.push(String(event.data));
    });

    ws.addEventListener("open", () => {
      resolve(ws);
    });
    ws.addEventListener("error", () => {
      reject(new Error(`Failed to connect websocket: ${url}`));
    });
  });

export const sendJson = (ws: WebSocket, payload: unknown) => {
  ws.send(JSON.stringify(payload));
};

export const waitForMessage = <T>(
  ws: WebSocket,
  schema: ZodType<T>,
  timeoutMs = 1000,
): Promise<T> =>
  new Promise((resolve, reject) => {
    const queuedWs = ws as QueuedWebSocket;
    const queued = queuedWs.__queuedMessages ?? [];
    for (let index = 0; index < queued.length; index += 1) {
      const data = queued[index];
      if (!data) {
        continue;
      }
      try {
        const parsed = schema.parse(JSON.parse(data));
        pullAt(queued, [index]);
        resolve(parsed);
        return;
      } catch {
        // ignore unmatched queued payloads and continue waiting
      }
    }

    const timeoutId = setTimeout(() => {
      reject(new Error("Timed out while waiting websocket message"));
    }, timeoutMs);

    const handler = (event: MessageEvent) => {
      clearTimeout(timeoutId);
      ws.removeEventListener("message", handler);
      if (queuedWs.__queuedMessages) {
        pullAt(queuedWs.__queuedMessages, [0]);
      }
      try {
        const rawData = JSON.parse(String(event.data));
        resolve(schema.parse(rawData));
      } catch (error) {
        reject(error);
      }
    };

    ws.addEventListener("message", handler);
  });

export const expectNoMessage = (
  ws: WebSocket,
  timeoutMs = 300,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const handler = () => {
      ws.removeEventListener("message", handler);
      reject(new Error("Expected no websocket message, but received one."));
    };

    ws.addEventListener("message", handler);
    delay(timeoutMs).then(() => {
      ws.removeEventListener("message", handler);
      resolve();
    });
  });
