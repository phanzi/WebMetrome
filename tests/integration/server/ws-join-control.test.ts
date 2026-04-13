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
  role: z.literal("owner"),
});

const roomJoinedSchema = z.object({
  type: z.literal("room-joined"),
  roomId: z.string(),
  role: z.union([z.literal("owner"), z.literal("member")]),
});

const metronomeStateSchema = z.object({
  type: z.literal("metronome-state"),
  roomId: z.string(),
  metronome: z.object({
    bpm: z.number(),
    beats: z.number(),
  }),
});

const playScheduleSchema = z.object({
  type: z.literal("play-schedule"),
  roomId: z.string(),
  at: z.number(),
});

const errorSchema = z.object({
  type: z.literal("error"),
  code: z.string(),
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

  it("creates room on connect and sends snapshot in order on join", async () => {
    const { port, stop } = await startTestServer();
    stopServer = stop;

    const host = await connectWebSocket(`ws://localhost:${port}/room`);
    sockets.push(host);

    const created = await waitForMessage(host, roomCreatedSchema);
    sendJson(host, {
      type: "set-metronome",
      metronome: { bpm: 140, beats: 4 },
    });
    const hostMetronome = await waitForMessage(host, metronomeStateSchema);
    expect(hostMetronome.metronome).toEqual({ bpm: 140, beats: 4 });

    const member = await connectWebSocket(
      `ws://localhost:${port}/room?id=${created.roomId}`,
    );
    sockets.push(member);

    const joined = await waitForMessage(member, roomJoinedSchema);
    expect(joined.roomId).toBe(created.roomId);

    const metronomeState = await waitForMessage(member, metronomeStateSchema);
    expect(metronomeState.metronome).toEqual({
      bpm: 140,
      beats: 4,
    });
  });

  it("rejects non-owner update requests", async () => {
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

    sendJson(member, {
      type: "set-metronome",
      metronome: { bpm: 90, beats: 3 },
    });

    const unauthorized = await waitForMessage(member, errorSchema);
    expect(unauthorized.code).toBe("UNAUTHORIZED");
    await expectNoMessage(host);
  });

  it("allows metronome updates after play-schedule (no server playing lock)", async () => {
    const { port, stop } = await startTestServer();
    stopServer = stop;

    const host = await connectWebSocket(`ws://localhost:${port}/room`);
    sockets.push(host);
    await waitForMessage(host, roomCreatedSchema);

    sendJson(host, {
      type: "play-schedule",
      at: Date.now() + 60_000,
    });
    await waitForMessage(host, playScheduleSchema);

    sendJson(host, {
      type: "set-metronome",
      metronome: { bpm: 150, beats: 4 },
    });
    const updated = await waitForMessage(host, metronomeStateSchema);
    expect(updated.metronome).toEqual({ bpm: 150, beats: 4 });
  });
});
