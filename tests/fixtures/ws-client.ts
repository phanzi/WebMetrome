export const connectWebSocket = (url: string): Promise<WebSocket> =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
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
  timeoutMs = 1000,
): Promise<T> =>
  new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Timed out while waiting websocket message"));
    }, timeoutMs);

    const handler = (event: MessageEvent) => {
      clearTimeout(timeoutId);
      ws.removeEventListener("message", handler);
      resolve(JSON.parse(String(event.data)) as T);
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
    setTimeout(() => {
      ws.removeEventListener("message", handler);
      resolve();
    }, timeoutMs);
  });
