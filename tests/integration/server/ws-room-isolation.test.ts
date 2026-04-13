import { afterEach, describe, expect, it } from "bun:test";
import { z } from "zod";
import { startTestServer } from "../../fixtures/test-server";
import {
  connectWebSocket,
  expectNoMessage,
  sendJson,
  waitForMessage,
} from "../../fixtures/ws-client";

const roomMessageSchema = z.object({
  bpm: z.number(),
});

describe("WebSocket room isolation", () => {
  const sockets: WebSocket[] = [];
  let stopServer = () => {};

  afterEach(() => {
    for (const socket of sockets) {
      socket.close();
    }
    sockets.length = 0;
    stopServer();
  });

  it("delivers control signal only to the same room", async () => {
    const { port, stop } = await startTestServer();
    stopServer = stop;

    const host = await connectWebSocket(`ws://localhost:${port}/sync`);
    const memberA = await connectWebSocket(`ws://localhost:${port}/sync`);
    const memberB = await connectWebSocket(`ws://localhost:${port}/sync`);
    sockets.push(host, memberA, memberB);

    sendJson(host, { type: "join", roomId: "AB12" });
    sendJson(memberA, { type: "join", roomId: "AB12" });
    sendJson(memberB, { type: "join", roomId: "CD34" });
    await Bun.sleep(20);

    sendJson(host, {
      type: "control",
      roomId: "AB12",
      bpm: 128,
      beats: 3,
      isPlaying: true,
    });

    const roomMessage = await waitForMessage(memberA, roomMessageSchema);
    expect(roomMessage.bpm).toBe(128);
    await expectNoMessage(memberB);
  });
});
