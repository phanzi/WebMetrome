import {
  MIN_CONTROL_INTERVAL_MS,
  createRoomSyncService,
} from "@server/domain/roomSync";
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

  it("relays play-schedule and play-halt to room members", () => {
    let nowMs = 10_000;
    const service = createRoomSyncService({ now: () => nowMs });
    const hostSender = mock(() => {});
    const memberSender = mock(() => {});
    service.open("host", hostSender);
    service.open("member", memberSender);
    const created = service.createRoom("host");
    if (!created.ok) {
      throw new Error("expected room to be created");
    }
    service.joinRoom("member", created.roomId);

    const at = nowMs + 5000;
    const scheduled = service.relayPlaySchedule("host", { at });
    expect(scheduled.ok).toBe(true);
    const schedulePayload = {
      type: "play-schedule" as const,
      roomId: created.roomId,
      at,
    };
    expect(hostSender).toHaveBeenNthCalledWith(1, schedulePayload);
    expect(memberSender).toHaveBeenNthCalledWith(1, schedulePayload);

    nowMs += MIN_CONTROL_INTERVAL_MS;
    const halted = service.relayPlayHalt("host");
    expect(halted.ok).toBe(true);
    const haltPayload = {
      type: "play-halt" as const,
      roomId: created.roomId,
    };
    expect(hostSender).toHaveBeenNthCalledWith(2, haltPayload);
    expect(memberSender).toHaveBeenNthCalledWith(2, haltPayload);
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
