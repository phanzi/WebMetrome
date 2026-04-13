import { describe, expect, it, mock } from "bun:test";
import { createRoomSyncService } from "../../../server/domain/roomSync";

describe("createRoomSyncService room state", () => {
  it("joins room and switches to another room", () => {
    const service = createRoomSyncService();
    const sender = mock(() => {});

    service.open("host-1");
    expect(service.join("host-1", "AB12", sender)).toBe("AB12");
    expect(service.getRoomSize("AB12")).toBe(1);

    expect(service.join("host-1", "CD34", sender)).toBe("CD34");
    expect(service.getRoomSize("AB12")).toBe(0);
    expect(service.getRoomSize("CD34")).toBe(1);
  });

  it("broadcasts to peers only", () => {
    const service = createRoomSyncService();
    const hostSender = mock(() => {});
    const memberSender = mock(() => {});

    service.open("host");
    service.open("member");
    service.join("host", "ROOM1", hostSender);
    service.join("member", "ROOM1", memberSender);

    const payload = service.control("host", {
      bpm: 120,
      beats: 4,
      isPlaying: true,
    });

    expect(payload).not.toBeNull();
    expect(hostSender).toHaveBeenCalledTimes(0);
    expect(memberSender).toHaveBeenCalledTimes(1);
  });

  it("cleans up room on close", () => {
    const service = createRoomSyncService();
    const sender = mock(() => {});

    service.open("host");
    service.join("host", "ROOM1", sender);
    service.close("host");

    expect(service.getRoomSize("ROOM1")).toBe(0);
    expect(service.getConnectionRoom("host")).toBeNull();
  });
});
