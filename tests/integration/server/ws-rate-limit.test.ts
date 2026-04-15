import { afterEach, describe, it } from "bun:test";
import { noop } from "es-toolkit";
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
});

const rateLimitErrorSchema = z.object({
  type: z.literal("error"),
  code: z.literal("RATE_LIMIT"),
  message: z.literal("Too many requests"),
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

    sendJson(host, {
      type: "set-metronome",
      metronome: { bpm: 121, beats: 4 },
    });

    await waitForMessage(host, rateLimitErrorSchema);
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

    sendJson(host, {
      type: "play-schedule",
      startedAt: fixedNow + 60_000,
    });

    await waitForMessage(host, rateLimitErrorSchema);
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
      startedAt: fixedNow + 60_000,
    });

    sendJson(host, {
      type: "set-metronome",
      metronome: { bpm: 150, beats: 4 },
    });

    await waitForMessage(host, rateLimitErrorSchema);
  });
});
