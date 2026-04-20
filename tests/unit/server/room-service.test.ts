import {
  DEFAULT_BEATS,
  DEFAULT_BPM,
  ROOM_ID_REGEX,
} from "@server/domain/constants";
import { RoomService } from "@server/domain/roomService";
import { describe, expect, it, mock } from "bun:test";

/** Minimal message shape for RoomService generic; real WS schema is in app.ts. */
type TestMessage = { type: string };

const createSocket = (id: string) => {
  const send = mock((_data: TestMessage) => {});
  return { ws: { id, send }, send };
};

describe("RoomService", () => {
  it("creates a room once per owner and returns generated id", () => {
    const service = new RoomService<TestMessage>();
    const { ws: host } = createSocket("host");

    const created = service.createRoom(host);
    expect(created.success).toBe(true);
    if (!created.success) {
      return;
    }

    expect(created.data.id).toMatch(ROOM_ID_REGEX);

    const duplicate = service.createRoom(host);
    expect(duplicate.success).toBe(false);
    if (!duplicate.success) {
      expect(duplicate.code).toBe("ALREADY_CREATED");
    }
  });

  it("validates room id and join preconditions", () => {
    const service = new RoomService<TestMessage>();
    const { ws: host } = createSocket("host");
    const { ws: member } = createSocket("member");

    service.createRoom(host);

    const invalidIdJoin = service.joinRoom(member, "bad");
    expect(invalidIdJoin.success).toBe(false);
    if (!invalidIdJoin.success) {
      expect(invalidIdJoin.code).toBe("INVALID_ROOM_ID");
    }

    const missingRoomJoin = service.joinRoom(member, "ABCDEF");
    expect(missingRoomJoin.success).toBe(false);
    if (!missingRoomJoin.success) {
      expect(missingRoomJoin.code).toBe("ROOM_NOT_FOUND");
    }
  });

  it("returns latest metronome state and play schedule for late joiner", () => {
    const service = new RoomService<TestMessage>();
    const { ws: host } = createSocket("host");
    const { ws: member } = createSocket("member");
    const { ws: late } = createSocket("late");

    const created = service.createRoom(host);
    expect(created.success).toBe(true);
    if (!created.success) {
      return;
    }

    const joined = service.joinRoom(member, created.data.id);
    expect(joined.success).toBe(true);
    if (!joined.success) {
      return;
    }

    const set = service.setMetronomeState(host.id, {
      bpm: 150,
      beats: 6,
    });
    expect(set.success).toBe(true);

    const scheduled = service.play(host.id, 123_456);
    expect(scheduled.success).toBe(true);

    const lateJoin = service.joinRoom(late, created.data.id);
    expect(lateJoin.success).toBe(true);
    if (!lateJoin.success) {
      return;
    }

    expect(lateJoin.data.room.metronome).toEqual({ bpm: 150, beats: 6 });
    expect(lateJoin.data.room.lastPlayAt).toBe(123_456);
  });

  it("enforces owner permissions for state updates", () => {
    const service = new RoomService<TestMessage>();
    const { ws: host } = createSocket("host");
    const { ws: member } = createSocket("member");

    const created = service.createRoom(host);
    expect(created.success).toBe(true);
    if (!created.success) {
      return;
    }
    service.joinRoom(member, created.data.id);

    const unauthorizedSet = service.setMetronomeState(member.id, {
      bpm: DEFAULT_BPM,
      beats: DEFAULT_BEATS,
    });
    expect(unauthorizedSet.success).toBe(false);
    if (!unauthorizedSet.success) {
      expect(unauthorizedSet.code).toBe("UNAUTHORIZED");
    }

    const unauthorizedSchedule = service.play(member.id, Date.now());
    expect(unauthorizedSchedule.success).toBe(false);
    if (!unauthorizedSchedule.success) {
      expect(unauthorizedSchedule.code).toBe("UNAUTHORIZED");
    }

    const unauthorizedHalt = service.haltPlay(member.id);
    expect(unauthorizedHalt.success).toBe(false);
    if (!unauthorizedHalt.success) {
      expect(unauthorizedHalt.code).toBe("UNAUTHORIZED");
    }
  });

  it("handles member leave, owner handoff, and room close", () => {
    const service = new RoomService<TestMessage>();
    const { ws: host } = createSocket("host");
    const { ws: member } = createSocket("member");

    const created = service.createRoom(host);
    expect(created.success).toBe(true);
    if (!created.success) {
      return;
    }
    service.joinRoom(member, created.data.id);

    const memberLeft = service.leaveRoom(member.id);
    expect(memberLeft.success).toBe(true);
    if (memberLeft.success) {
      expect(memberLeft.data.type).toBe("member-left");
    }

    // Re-join member to verify owner handoff path.
    const rejoin = service.joinRoom(member, created.data.id);
    expect(rejoin.success).toBe(true);

    const ownerChanged = service.leaveRoom(host.id);
    expect(ownerChanged.success).toBe(true);
    if (ownerChanged.success) {
      expect(ownerChanged.data.type).toBe("owner-changed");
      if (ownerChanged.data.type === "owner-changed") {
        expect(ownerChanged.data.owner.id).toBe(member.id);
      }
    }

    const hostOnlyService = new RoomService<TestMessage>();
    const { ws: soloHost } = createSocket("solo-host");
    const soloRoom = hostOnlyService.createRoom(soloHost);
    expect(soloRoom.success).toBe(true);
    if (!soloRoom.success) {
      return;
    }
    const roomClosed = hostOnlyService.leaveRoom(soloHost.id);
    expect(roomClosed.success).toBe(true);
    if (roomClosed.success) {
      expect(roomClosed.data.type).toBe("room-closed");
    }
  });
});
