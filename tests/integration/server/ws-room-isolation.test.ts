import { afterEach, describe, expect, it } from "bun:test";
import { noop } from "es-toolkit";
import { startTestServer } from "../../fixtures/test-server";
import {
  connectWebSocket,
  expectNoMessage,
  sendJson,
  waitForMessage,
} from "../../fixtures/ws-client";
import {
  roomCreatedSchema,
  roomJoinedSchema,
  setMetronomeSchema,
} from "../../fixtures/ws-message-schemas";

describe("WebSocket room isolation", () => {
  const sockets: WebSocket[] = [];
  let stopServer = noop;

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

    const host = await connectWebSocket(`ws://localhost:${port}/room`);
    const otherHost = await connectWebSocket(`ws://localhost:${port}/room`);
    sockets.push(host, otherHost);

    const hostRoom = await waitForMessage(host, roomCreatedSchema);
    const otherRoom = await waitForMessage(otherHost, roomCreatedSchema);

    const memberA = await connectWebSocket(
      `ws://localhost:${port}/room?id=${hostRoom.payload.roomId}`,
    );
    const memberB = await connectWebSocket(
      `ws://localhost:${port}/room?id=${otherRoom.payload.roomId}`,
    );
    sockets.push(memberA, memberB);
    await waitForMessage(memberA, roomJoinedSchema);
    await waitForMessage(memberA, setMetronomeSchema);
    await waitForMessage(memberB, roomJoinedSchema);
    await waitForMessage(memberB, setMetronomeSchema);

    sendJson(host, {
      type: "set-metronome",
      payload: {
        bpm: 128,
        beats: 3,
      },
    });

    const roomMessage = await waitForMessage(memberA, setMetronomeSchema);
    expect(roomMessage.payload.bpm).toBe(128);
    await expectNoMessage(otherHost);
    await expectNoMessage(memberB);
  });
});
