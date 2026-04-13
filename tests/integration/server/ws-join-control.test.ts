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

const playingStateSchema = z.object({
  type: z.literal("playing-state"),
  roomId: z.string(),
  playing: z.object({
    updatedAt: z.number(),
    isPlaying: z.boolean(),
  }),
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

    sendJson(host, {
      type: "set-playing",
      playing: {
        updatedAt: Date.now(),
        isPlaying: true,
      },
    });
    const hostPlaying = await waitForMessage(host, playingStateSchema);
    expect(hostPlaying.playing.isPlaying).toBe(true);

    const member = await connectWebSocket(
      `ws://localhost:${port}/room?id=${created.roomId}`,
    );
    sockets.push(member);

    const joined = await waitForMessage(member, roomJoinedSchema);
    expect(joined.roomId).toBe(created.roomId);

    const metronomeState = await waitForMessage(member, metronomeStateSchema);
    const playingState = await waitForMessage(member, playingStateSchema);
    expect(metronomeState.metronome).toEqual({
      bpm: 140,
      beats: 4,
    });
    expect(playingState.playing.isPlaying).toBe(true);
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
    await waitForMessage(member, playingStateSchema);

    sendJson(member, {
      type: "set-metronome",
      metronome: { bpm: 90, beats: 3 },
    });

    const unauthorized = await waitForMessage(member, errorSchema);
    expect(unauthorized.code).toBe("UNAUTHORIZED");
    await expectNoMessage(host);
  });

  it("blocks metronome configuration updates while playing", async () => {
    const { port, stop } = await startTestServer();
    stopServer = stop;

    const host = await connectWebSocket(`ws://localhost:${port}/room`);
    sockets.push(host);
    await waitForMessage(host, roomCreatedSchema);

    sendJson(host, {
      type: "set-playing",
      playing: {
        updatedAt: Date.now(),
        isPlaying: true,
      },
    });
    await waitForMessage(host, playingStateSchema);

    sendJson(host, {
      type: "set-metronome",
      metronome: { bpm: 150, beats: 4 },
    });
    const blocked = await waitForMessage(host, errorSchema);
    expect(blocked.code).toBe("PLAYING_LOCKED");
  });
});
