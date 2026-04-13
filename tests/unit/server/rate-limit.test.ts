import { describe, expect, it, mock } from "bun:test";
import {
  MIN_CONTROL_INTERVAL_MS,
  createRoomSyncService,
} from "../../../server/domain/roomSync";

describe("createRoomSyncService rate limit", () => {
  it("drops too frequent control messages", () => {
    let now = 1000;
    const service = createRoomSyncService({
      now: () => now,
    });
    const sender = mock(() => {});

    service.open("host");
    service.open("member");
    service.join(
      "host",
      "ROOM1",
      mock(() => {}),
    );
    service.join("member", "ROOM1", sender);

    const first = service.control("host", {
      bpm: 120,
      beats: 4,
      isPlaying: true,
    });
    expect(first).not.toBeNull();
    expect(sender).toHaveBeenCalledTimes(1);

    now += MIN_CONTROL_INTERVAL_MS - 1;
    const dropped = service.control("host", {
      bpm: 121,
      beats: 4,
      isPlaying: true,
    });
    expect(dropped).toBeNull();
    expect(sender).toHaveBeenCalledTimes(1);

    now += 1;
    const accepted = service.control("host", {
      bpm: 122,
      beats: 4,
      isPlaying: false,
    });
    expect(accepted).not.toBeNull();
    expect(sender).toHaveBeenCalledTimes(2);
  });
});
