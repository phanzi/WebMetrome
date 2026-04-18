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
  roomCreatedSchema,
  roomJoinedSchema,
  setMetronomeSchema,
} from "../../fixtures/ws-message-schemas";

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
      `ws://localhost:${port}/room?id=${created.payload.roomId}`,
    );
    sockets.push(member);
    await waitForMessage(member, roomJoinedSchema);
    await waitForMessage(member, setMetronomeSchema);

    member.close();
    await delay(80);

    sendJson(host, {
      type: "set-metronome",
      payload: {
        bpm: 100,
        beats: 4,
      },
    });
    await expectNoMessage(host);

    const replacementMember = await connectWebSocket(
      `ws://localhost:${port}/room?id=${created.payload.roomId}`,
    );
    sockets.push(replacementMember);
    await waitForMessage(replacementMember, roomJoinedSchema);

    const message = await waitForMessage(replacementMember, setMetronomeSchema);
    expect(message.payload.bpm).toBe(100);
  });

  it("removes room when owner disconnects", async () => {
    const { port, stop } = await startTestServer();
    stopServer = stop;

    const host = await connectWebSocket(`ws://localhost:${port}/room`);
    sockets.push(host);
    const created = await waitForMessage(host, roomCreatedSchema);
    host.close();
    await delay(80);

    const member = await connectWebSocket(
      `ws://localhost:${port}/room?id=${created.payload.roomId}`,
    );
    sockets.push(member);
    const error = await waitForMessage(member, errorSchema);
    expect(error.payload.code).toBe("ROOM_NOT_FOUND");
    await expectNoMessage(member);
  });
});
