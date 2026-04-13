import { createRoomSyncService } from "@server/domain/roomSync";
import { describe, expect, it, mock } from "bun:test";

describe("createRoomSyncService (domain has no transport rate limit)", () => {
  it("allows rapid metronome updates in domain layer", () => {
    const now = 1000;
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

    const second = service.replaceMetronomeState("host", {
      bpm: 121,
      beats: 4,
    });
    expect(second.ok).toBe(true);
    expect(sender).toHaveBeenCalledTimes(2);
    expect(peerSender).toHaveBeenCalledTimes(2);
  });
});
