import { afterEach, describe, expect, it } from "bun:test";
import { noop } from "es-toolkit/compat";
import { z } from "zod";
import { startTestServer } from "../../fixtures/test-server";
import {
  connectWebSocket,
  sendJson,
  waitForMessage,
} from "../../fixtures/ws-client";

const roomCreatedSchema = z.object({
  type: z.literal("room-created"),
  roomId: z.string(),
  role: z.literal("owner"),
});

const metronomeStateSchema = z.object({
  type: z.literal("metronome-state"),
  roomId: z.string(),
  metronome: z.object({
    bpm: z.number(),
    beats: z.number(),
  }),
});

const rateLimitErrorSchema = z.object({
  type: z.literal("error"),
  code: z.literal("RATE_LIMIT"),
  message: z.literal("요청이 너무 빠릅니다."),
});

const playScheduleSchema = z.object({
  type: z.literal("play-schedule"),
  roomId: z.string(),
  at: z.number(),
});

describe("WebSocket rate limit", () => {
  const sockets: WebSocket[] = [];
  let stopServer = noop;

  afterEach(() => {
    for (const socket of sockets) {
      socket.close();
    }
    sockets.length = 0;
    stopServer();
  });

  it("returns RATE_LIMIT when set-metronome is sent twice at the same server time", async () => {
    const fixedNow = 100_000;
    const { port, stop } = await startTestServer({
      now: () => fixedNow,
    });
    stopServer = stop;

    const host = await connectWebSocket(`ws://localhost:${port}/room`);
    sockets.push(host);

    await waitForMessage(host, roomCreatedSchema);

    sendJson(host, {
      type: "set-metronome",
      metronome: { bpm: 120, beats: 4 },
    });
    await waitForMessage(host, metronomeStateSchema);

    sendJson(host, {
      type: "set-metronome",
      metronome: { bpm: 121, beats: 4 },
    });

    const errorMessage = await waitForMessage(host, rateLimitErrorSchema);
    expect(errorMessage.code).toBe("RATE_LIMIT");
  });

  it("returns RATE_LIMIT when play-schedule follows set-metronome at same server time", async () => {
    const fixedNow = 200_000;
    const { port, stop } = await startTestServer({
      now: () => fixedNow,
    });
    stopServer = stop;

    const host = await connectWebSocket(`ws://localhost:${port}/room`);
    sockets.push(host);

    await waitForMessage(host, roomCreatedSchema);

    sendJson(host, {
      type: "set-metronome",
      metronome: { bpm: 120, beats: 4 },
    });
    await waitForMessage(host, metronomeStateSchema);

    sendJson(host, {
      type: "play-schedule",
      at: fixedNow + 60_000,
    });

    const errorMessage = await waitForMessage(host, rateLimitErrorSchema);
    expect(errorMessage.code).toBe("RATE_LIMIT");
  });

  it("returns RATE_LIMIT when set-metronome follows play-schedule at same server time", async () => {
    const fixedNow = 300_000;
    const { port, stop } = await startTestServer({
      now: () => fixedNow,
    });
    stopServer = stop;

    const host = await connectWebSocket(`ws://localhost:${port}/room`);
    sockets.push(host);

    await waitForMessage(host, roomCreatedSchema);

    sendJson(host, {
      type: "play-schedule",
      at: fixedNow + 60_000,
    });
    await waitForMessage(host, playScheduleSchema);

    sendJson(host, {
      type: "set-metronome",
      metronome: { bpm: 150, beats: 4 },
    });

    const errorMessage = await waitForMessage(host, rateLimitErrorSchema);
    expect(errorMessage.code).toBe("RATE_LIMIT");
  });
});
