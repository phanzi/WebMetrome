import { afterEach, describe, expect, it } from "bun:test";
import { z } from "zod";
import { startTestServer } from "../../fixtures/test-server";
import {
  connectWebSocket,
  expectNoMessage,
  sendJson,
  waitForMessage,
} from "../../fixtures/ws-client";

const roomCreatedSchema = z.object({
  type: z.literal("room-created"),
  roomId: z.string(),
});

const roomJoinedSchema = z.object({
  type: z.literal("room-joined"),
  roomId: z.string(),
});

const metronomeStateSchema = z.object({
  type: z.literal("metronome-state"),
  roomId: z.string(),
  metronome: z.object({
    bpm: z.number(),
    beats: z.number(),
  }),
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

    const host = await connectWebSocket(`ws://localhost:${port}/room`);
    const otherHost = await connectWebSocket(`ws://localhost:${port}/room`);
    sockets.push(host, otherHost);

    const hostRoom = await waitForMessage(host, roomCreatedSchema);
    const otherRoom = await waitForMessage(otherHost, roomCreatedSchema);

    const memberA = await connectWebSocket(
      `ws://localhost:${port}/room?id=${hostRoom.roomId}`,
    );
    const memberB = await connectWebSocket(
      `ws://localhost:${port}/room?id=${otherRoom.roomId}`,
    );
    sockets.push(memberA, memberB);
    await waitForMessage(memberA, roomJoinedSchema);
    await waitForMessage(memberA, metronomeStateSchema);
    await waitForMessage(
      memberA,
      z.object({
        type: z.literal("playing-state"),
      }),
    );
    await waitForMessage(memberB, roomJoinedSchema);
    await waitForMessage(memberB, metronomeStateSchema);
    await waitForMessage(
      memberB,
      z.object({
        type: z.literal("playing-state"),
      }),
    );

    sendJson(host, {
      type: "set-metronome",
      metronome: {
        bpm: 128,
        beats: 3,
      },
    });

    const roomMessage = await waitForMessage(memberA, metronomeStateSchema);
    expect(roomMessage.metronome.bpm).toBe(128);
    await expectNoMessage(memberB);
  });
});
