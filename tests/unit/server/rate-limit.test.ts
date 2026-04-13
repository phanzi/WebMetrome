import {
  MIN_CONTROL_INTERVAL_MS,
  createRoomSyncService,
} from "@server/domain/roomSync";
import { describe, expect, it, mock } from "bun:test";

describe("createRoomSyncService rate limit", () => {
  it("drops too frequent control messages", () => {
    let now = 1000;
    const service = createRoomSyncService({
      now: () => now,
    });
    const sender = mock(() => {});
    const peerSender = mock(() => {});

    service.open("host", sender);
    service.open("member", peerSender);
    const created = service.createRoom("host");
    if (!created.ok) {
      throw new Error("expected room to be created");
    }
    service.joinRoom("member", created.roomId);

    const first = service.replaceMetronomeState("host", {
      bpm: 120,
      beats: 4,
    });
    expect(first.ok).toBe(true);
    expect(sender).toHaveBeenCalledTimes(1);
    expect(peerSender).toHaveBeenCalledTimes(1);

    now += MIN_CONTROL_INTERVAL_MS - 1;
    const dropped = service.replaceMetronomeState("host", {
      bpm: 121,
      beats: 4,
    });
    expect(dropped.ok).toBe(false);
    if (!dropped.ok) {
      expect(dropped.code).toBe("RATE_LIMIT");
    }
    expect(sender).toHaveBeenCalledTimes(1);
    expect(peerSender).toHaveBeenCalledTimes(1);

    now += 1;
    const accepted = service.replaceMetronomeState("host", {
      bpm: 122,
      beats: 4,
    });
    expect(accepted.ok).toBe(true);
    expect(sender).toHaveBeenCalledTimes(2);
    expect(peerSender).toHaveBeenCalledTimes(2);
  });
});
