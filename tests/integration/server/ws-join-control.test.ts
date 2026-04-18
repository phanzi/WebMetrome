import { MIN_CONTROL_INTERVAL_MS } from "@server/shared/rateLimiter";
import { afterEach, describe, expect, it } from "bun:test";
import { delay, noop } from "es-toolkit";
import { startTestServer } from "../../fixtures/test-server";
import {
  connectWebSocket,
  expectNoMessage,
  sendJson,
  waitForMessage,
} from "../../fixtures/ws-client";
import {
  errorSchema,
  playHaltSchema,
  playScheduleSchema,
  roomCreatedSchema,
  roomJoinedSchema,
  setMetronomeSchema,
} from "../../fixtures/ws-message-schemas";

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
      payload: { bpm: 140, beats: 4 },
    });
    await expectNoMessage(host);

    const member = await connectWebSocket(
      `ws://localhost:${port}/room?id=${created.payload.roomId}`,
    );
    sockets.push(member);

    const joined = await waitForMessage(member, roomJoinedSchema);
    expect(joined.payload.roomId).toBe(created.payload.roomId);

    const metronomeSnap = await waitForMessage(member, setMetronomeSchema);
    expect(metronomeSnap.payload).toEqual({
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
      `ws://localhost:${port}/room?id=${created.payload.roomId}`,
    );
    sockets.push(member);
    await waitForMessage(member, roomJoinedSchema);
    await waitForMessage(member, setMetronomeSchema);

    sendJson(member, {
      type: "set-metronome",
      payload: { bpm: 90, beats: 3 },
    });

    const unauthorized = await waitForMessage(member, errorSchema);
    expect(unauthorized.payload.code).toBe("UNAUTHORIZED");
    await expectNoMessage(host);
  });

  it("allows metronome updates after play-schedule (no server playing lock)", async () => {
    const { port, stop } = await startTestServer();
    stopServer = stop;

    const host = await connectWebSocket(`ws://localhost:${port}/room`);
    sockets.push(host);
    const created = await waitForMessage(host, roomCreatedSchema);
    const member = await connectWebSocket(
      `ws://localhost:${port}/room?id=${created.payload.roomId}`,
    );
    sockets.push(member);
    await waitForMessage(member, roomJoinedSchema);
    await waitForMessage(member, setMetronomeSchema);

    const startedAt = Date.now() + 60_000;
    sendJson(host, {
      type: "play-schedule",
      payload: { at: startedAt },
    });
    const scheduled = await waitForMessage(member, playScheduleSchema);
    expect(scheduled.payload.at).toBe(startedAt);

    await delay(MIN_CONTROL_INTERVAL_MS + 5);

    sendJson(host, {
      type: "set-metronome",
      payload: { bpm: 150, beats: 4 },
    });
    const updated = await waitForMessage(member, setMetronomeSchema);
    expect(updated.payload).toEqual({ bpm: 150, beats: 4 });
  });

  it("replays play-schedule after room-joined and set-metronome for late join", async () => {
    const { port, stop } = await startTestServer();
    stopServer = stop;

    const host = await connectWebSocket(`ws://localhost:${port}/room`);
    sockets.push(host);
    const created = await waitForMessage(host, roomCreatedSchema);

    const startedAt = Date.now() + 60_000;
    sendJson(host, {
      type: "play-schedule",
      payload: { at: startedAt },
    });
    await expectNoMessage(host);

    const lateMember = await connectWebSocket(
      `ws://localhost:${port}/room?id=${created.payload.roomId}`,
    );
    sockets.push(lateMember);

    const joined = await waitForMessage(lateMember, roomJoinedSchema);
    expect(joined.payload.roomId).toBe(created.payload.roomId);

    const metronomeSnap = await waitForMessage(lateMember, setMetronomeSchema);
    expect(metronomeSnap.payload).toEqual({ bpm: 120, beats: 4 });

    const replayedSchedule = await waitForMessage(
      lateMember,
      playScheduleSchema,
    );
    expect(replayedSchedule.payload.at).toBe(startedAt);
  });

  it("does not replay play-schedule for late join after play-halt", async () => {
    const { port, stop } = await startTestServer();
    stopServer = stop;

    const host = await connectWebSocket(`ws://localhost:${port}/room`);
    sockets.push(host);
    const created = await waitForMessage(host, roomCreatedSchema);
    const member = await connectWebSocket(
      `ws://localhost:${port}/room?id=${created.payload.roomId}`,
    );
    sockets.push(member);
    await waitForMessage(member, roomJoinedSchema);
    await waitForMessage(member, setMetronomeSchema);

    sendJson(host, {
      type: "play-schedule",
      payload: { at: Date.now() + 60_000 },
    });
    await waitForMessage(member, playScheduleSchema);

    await delay(MIN_CONTROL_INTERVAL_MS + 5);
    sendJson(host, { type: "play-halt" });
    const halted = await waitForMessage(member, playHaltSchema);
    expect(halted.type).toBe("play-halt");

    const lateMember = await connectWebSocket(
      `ws://localhost:${port}/room?id=${created.payload.roomId}`,
    );
    sockets.push(lateMember);

    const joined = await waitForMessage(lateMember, roomJoinedSchema);
    expect(joined.payload.roomId).toBe(created.payload.roomId);

    const metronomeSnap = await waitForMessage(lateMember, setMetronomeSchema);
    expect(metronomeSnap.payload).toEqual({ bpm: 120, beats: 4 });

    await expectNoMessage(lateMember, 300);
  });
});
