import { afterEach, describe, expect, it } from "bun:test";
import { delay, noop } from "es-toolkit";
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
  metronome: z.object({
    bpm: z.number(),
    beats: z.number(),
  }),
});

const errorSchema = z.object({
  type: z.literal("error"),
  code: z.string(),
});

describe("WebSocket close cleanup", () => {
  const sockets: WebSocket[] = [];
  let stopServer = noop;

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

    const host = await connectWebSocket(`ws://localhost:${port}/room`);
    sockets.push(host);
    const created = await waitForMessage(host, roomCreatedSchema);

    const member = await connectWebSocket(
      `ws://localhost:${port}/room?id=${created.roomId}`,
    );
    sockets.push(member);
    await waitForMessage(member, roomJoinedSchema);
    await waitForMessage(member, metronomeStateSchema);

    member.close();
    await delay(20);

    sendJson(host, {
      type: "set-metronome",
      metronome: {
        bpm: 100,
        beats: 4,
      },
    });
    await waitForMessage(host, metronomeStateSchema);

    const replacementMember = await connectWebSocket(
      `ws://localhost:${port}/room?id=${created.roomId}`,
    );
    sockets.push(replacementMember);
    await waitForMessage(replacementMember, roomJoinedSchema);

    const message = await waitForMessage(
      replacementMember,
      metronomeStateSchema,
    );
    expect(message.metronome.bpm).toBe(100);
  });

  it("removes room when owner disconnects", async () => {
    const { port, stop } = await startTestServer();
    stopServer = stop;

    const host = await connectWebSocket(`ws://localhost:${port}/room`);
    sockets.push(host);
    const created = await waitForMessage(host, roomCreatedSchema);
    host.close();
    await delay(20);

    const member = await connectWebSocket(
      `ws://localhost:${port}/room?id=${created.roomId}`,
    );
    sockets.push(member);
    const error = await waitForMessage(member, errorSchema);
    expect(error.code).toBe("INVALID_ROOM");
    await expectNoMessage(member);
  });
});
