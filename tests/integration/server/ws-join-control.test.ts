import { afterEach, describe, expect, it } from "bun:test";
import { z } from "zod";
import { startTestServer } from "../../fixtures/test-server";
import {
  connectWebSocket,
  sendJson,
  waitForMessage,
} from "../../fixtures/ws-client";

const controlMessageSchema = z.object({
  bpm: z.number(),
  beats: z.number(),
  isPlaying: z.boolean(),
});

describe("WebSocket join/control", () => {
  const sockets: WebSocket[] = [];
  let stopServer = () => {};

  afterEach(() => {
    for (const socket of sockets) {
      socket.close();
    }
    sockets.length = 0;
    stopServer();
  });

  it("broadcasts host control payload to joined member", async () => {
    const { port, stop } = await startTestServer();
    stopServer = stop;

    const host = await connectWebSocket(`ws://localhost:${port}/sync`);
    const member = await connectWebSocket(`ws://localhost:${port}/sync`);
    sockets.push(host, member);

    sendJson(host, { type: "join", roomId: "AB12" });
    sendJson(member, { type: "join", roomId: "AB12" });
    await Bun.sleep(20);

    sendJson(host, {
      type: "control",
      roomId: "AB12",
      bpm: 140,
      beats: 4,
      isPlaying: true,
    });

    const message = await waitForMessage(member, controlMessageSchema);

    expect(message).toEqual({
      bpm: 140,
      beats: 4,
      isPlaying: true,
    });
  });
});
