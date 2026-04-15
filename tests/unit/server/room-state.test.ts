import { MIN_CONTROL_INTERVAL_MS } from "@server/app";
import {
  PLAY_SCHEDULE_FUTURE_LIMIT_MS,
  PLAY_SCHEDULE_PAST_TOLERANCE_MS,
} from "@server/domain/constants";
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
    if (joined.ok) {
      expect(joined.replayPlaySchedule).toBeNull();
    }
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

    const startedAt = nowMs + 5000;
    const scheduled = service.relayPlaySchedule("host", { startedAt });
    expect(scheduled.ok).toBe(true);
    const schedulePayload = {
      type: "play-schedule" as const,
      roomId: created.roomId,
      startedAt,
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

  it("returns replay play-schedule for late join and clears it on halt", () => {
    let nowMs = 10_000;
    const service = createRoomSyncService({ now: () => nowMs });
    const sender = mock(() => {});

    service.open("host", sender);
    service.open("member", sender);
    service.open("late-member", sender);
    service.open("late-after-halt", sender);

    const created = service.createRoom("host");
    if (!created.ok) {
      throw new Error("expected room to be created");
    }
    service.joinRoom("member", created.roomId);

    const startedAt = nowMs + 5000;
    const scheduled = service.relayPlaySchedule("host", { startedAt });
    expect(scheduled.ok).toBe(true);

    const lateJoined = service.joinRoom("late-member", created.roomId);
    expect(lateJoined.ok).toBe(true);
    if (lateJoined.ok) {
      expect(lateJoined.replayPlaySchedule).toEqual({
        type: "play-schedule",
        roomId: created.roomId,
        startedAt,
      });
    }

    nowMs += MIN_CONTROL_INTERVAL_MS;
    const halted = service.relayPlayHalt("host");
    expect(halted.ok).toBe(true);

    const joinedAfterHalt = service.joinRoom("late-after-halt", created.roomId);
    expect(joinedAfterHalt.ok).toBe(true);
    if (joinedAfterHalt.ok) {
      expect(joinedAfterHalt.replayPlaySchedule).toBeNull();
    }
  });

  it("accepts play-schedule boundaries and rejects outside window", () => {
    const nowMs = 50_000;
    const service = createRoomSyncService({ now: () => nowMs });
    const sender = mock(() => {});
    service.open("host", sender);
    const created = service.createRoom("host");
    if (!created.ok) {
      throw new Error("expected room to be created");
    }

    const lowerBoundary = nowMs - PLAY_SCHEDULE_PAST_TOLERANCE_MS;
    const upperBoundary = nowMs + PLAY_SCHEDULE_FUTURE_LIMIT_MS;
    expect(
      service.relayPlaySchedule("host", { startedAt: lowerBoundary }).ok,
    ).toBe(true);
    expect(
      service.relayPlaySchedule("host", { startedAt: upperBoundary }).ok,
    ).toBe(true);
    const beforeLower = service.relayPlaySchedule("host", {
      startedAt: lowerBoundary - 1,
    });
    expect(beforeLower.ok).toBe(false);
    if (!beforeLower.ok) {
      expect(beforeLower.code).toBe("INVALID_PAYLOAD");
    }
    const afterUpper = service.relayPlaySchedule("host", {
      startedAt: upperBoundary + 1,
    });
    expect(afterUpper.ok).toBe(false);
    if (!afterUpper.ok) {
      expect(afterUpper.code).toBe("INVALID_PAYLOAD");
    }
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
