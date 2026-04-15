import { MIN_CONTROL_INTERVAL_MS } from "@server/shared/rateLimiter";
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

const playScheduleSchema = z.object({
  type: z.literal("play-schedule"),
  startedAt: z.number(),
});

const playHaltSchema = z.object({
  type: z.literal("play-halt"),
});

const errorSchema = z.object({
  type: z.literal("error"),
  code: z.string(),
});

describe("WebSocket join/control", () => {
  const sockets: WebSocket[] = [];
  let stopServer = noop;

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
    await expectNoMessage(host);

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
    const created = await waitForMessage(host, roomCreatedSchema);
    const member = await connectWebSocket(
      `ws://localhost:${port}/room?id=${created.roomId}`,
    );
    sockets.push(member);
    await waitForMessage(member, roomJoinedSchema);
    await waitForMessage(member, metronomeStateSchema);

    const startedAt = Date.now() + 60_000;
    sendJson(host, {
      type: "play-schedule",
      startedAt,
    });
    const scheduled = await waitForMessage(member, playScheduleSchema);
    expect(scheduled.startedAt).toBe(startedAt);

    await delay(MIN_CONTROL_INTERVAL_MS + 5);

    sendJson(host, {
      type: "set-metronome",
      metronome: { bpm: 150, beats: 4 },
    });
    const updated = await waitForMessage(member, metronomeStateSchema);
    expect(updated.metronome).toEqual({ bpm: 150, beats: 4 });
  });

  it("replays play-schedule after room-joined and metronome-state for late join", async () => {
    const { port, stop } = await startTestServer();
    stopServer = stop;

    const host = await connectWebSocket(`ws://localhost:${port}/room`);
    sockets.push(host);
    const created = await waitForMessage(host, roomCreatedSchema);

    const startedAt = Date.now() + 60_000;
    sendJson(host, {
      type: "play-schedule",
      startedAt,
    });
    await expectNoMessage(host);

    const lateMember = await connectWebSocket(
      `ws://localhost:${port}/room?id=${created.roomId}`,
    );
    sockets.push(lateMember);

    const joined = await waitForMessage(lateMember, roomJoinedSchema);
    expect(joined.roomId).toBe(created.roomId);

    const metronomeState = await waitForMessage(
      lateMember,
      metronomeStateSchema,
    );
    expect(metronomeState.metronome).toEqual({ bpm: 120, beats: 4 });

    const replayedSchedule = await waitForMessage(
      lateMember,
      playScheduleSchema,
    );
    expect(replayedSchedule.startedAt).toBe(startedAt);
  });

  it("does not replay play-schedule for late join after play-halt", async () => {
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

    sendJson(host, {
      type: "play-schedule",
      startedAt: Date.now() + 60_000,
    });
    await waitForMessage(member, playScheduleSchema);

    await delay(MIN_CONTROL_INTERVAL_MS + 5);
    sendJson(host, { type: "play-halt" });
    const halted = await waitForMessage(member, playHaltSchema);
    expect(halted.type).toBe("play-halt");

    const lateMember = await connectWebSocket(
      `ws://localhost:${port}/room?id=${created.roomId}`,
    );
    sockets.push(lateMember);

    const joined = await waitForMessage(lateMember, roomJoinedSchema);
    expect(joined.roomId).toBe(created.roomId);

    const metronomeState = await waitForMessage(
      lateMember,
      metronomeStateSchema,
    );
    expect(metronomeState.metronome).toEqual({ bpm: 120, beats: 4 });

    await expectNoMessage(lateMember, 300);
  });
});
