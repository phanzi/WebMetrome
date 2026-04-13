import { createRoomSyncService } from "@server/domain/roomSync";
import { describe, expect, it, mock } from "bun:test";

describe("createRoomSyncService room state", () => {
  it("creates room and lets member join", () => {
    const service = createRoomSyncService();
    const sender = mock(() => {});
    const memberSender = mock(() => {});

    service.open("host-1", sender);
    service.open("member-1", memberSender);
    const created = service.createRoom("host-1");
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    expect(service.getRoomSize(created.roomId)).toBe(1);

    const joined = service.joinRoom("member-1", created.roomId);
    expect(joined.ok).toBe(true);
    expect(service.getRoomSize(created.roomId)).toBe(2);
  });

  it("broadcasts to host and peers through server", () => {
    const service = createRoomSyncService();
    const hostSender = mock(() => {});
    const memberSender = mock(() => {});

    service.open("host", hostSender);
    service.open("member", memberSender);
    const created = service.createRoom("host");
    if (!created.ok) {
      throw new Error("expected room to be created");
    }
    service.joinRoom("member", created.roomId);

    const payload = service.replaceMetronomeState("host", {
      bpm: 120,
      beats: 4,
    });

    expect(payload.ok).toBe(true);
    expect(hostSender).toHaveBeenCalledTimes(1);
    expect(memberSender).toHaveBeenCalledTimes(1);
  });

  it("blocks metronome update while playing", () => {
    const service = createRoomSyncService();
    const sender = mock(() => {});
    service.open("host", sender);
    const created = service.createRoom("host");
    if (!created.ok) {
      throw new Error("expected room to be created");
    }

    const playing = service.replacePlayingState("host", {
      updatedAt: Date.now(),
      isPlaying: true,
    });
    expect(playing.ok).toBe(true);

    const blocked = service.replaceMetronomeState("host", {
      bpm: 80,
      beats: 3,
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) {
      return;
    }
    expect(blocked.code).toBe("PLAYING_LOCKED");
  });

  it("cleans up room on close", () => {
    const service = createRoomSyncService();
    const sender = mock(() => {});
    service.open("host", sender);
    const created = service.createRoom("host");
    if (!created.ok) {
      throw new Error("expected room to be created");
    }

    service.close("host");

    expect(service.getRoomSize(created.roomId)).toBe(0);
    expect(service.getConnectionRoom("host")).toBeNull();
  });
});
