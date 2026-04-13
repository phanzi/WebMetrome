import { afterEach, describe, expect, it } from "bun:test";
import { startTestServer } from "../../fixtures/test-server";
import {
  connectWebSocket,
  expectNoMessage,
  sendJson,
  waitForMessage,
} from "../../fixtures/ws-client";

describe("WebSocket close cleanup", () => {
  const sockets: WebSocket[] = [];
  let stopServer = () => {};

  afterEach(() => {
    for (const socket of sockets) {
      socket.close();
    }
    sockets.length = 0;
    stopServer();
  });

  it("does not send to closed peers and keeps room alive for host", async () => {
    const { port, stop } = await startTestServer();
    stopServer = stop;

    const host = await connectWebSocket(`ws://localhost:${port}/sync`);
    const member = await connectWebSocket(`ws://localhost:${port}/sync`);
    const replacementMember = await connectWebSocket(
      `ws://localhost:${port}/sync`,
    );
    sockets.push(host, member, replacementMember);

    sendJson(host, { type: "join", roomId: "AB12" });
    sendJson(member, { type: "join", roomId: "AB12" });
    await Bun.sleep(20);

    member.close();
    await Bun.sleep(20);

    sendJson(replacementMember, { type: "join", roomId: "AB12" });
    await Bun.sleep(20);

    sendJson(host, {
      type: "control",
      roomId: "AB12",
      bpm: 100,
      beats: 4,
      isPlaying: false,
    });

    const message = await waitForMessage<{ bpm: number; isPlaying: boolean }>(
      replacementMember,
    );
    expect(message.bpm).toBe(100);
    expect(message.isPlaying).toBe(false);
    await expectNoMessage(host);
  });
});
