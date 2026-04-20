import { DEFAULT_BEATS, DEFAULT_BPM } from "@/constants";
import { Fail, Ok } from "@server/shared/result";
import { nanoid } from "nanoid";
import {
  READY_ROOM_TIMEOUT_MS,
  ROOM_ID_GENERATE_STEPS,
  ROOM_ID_MIN_LENGTH,
} from "./constants";

interface IWebSocket<T> {
  id: string;
  send: (data: T) => void;
}
type MetronomeState = {
  bpm: number;
  beats: number;
};

type ReadyRoom = {
  id: string;
  timer: NodeJS.Timeout;
};

type MatureRoom<T extends { type: string }> = {
  id: string;
  metronome: MetronomeState;
  lastPlayAt: number | null;
  members: Map<string, IWebSocket<T>>;
  owner: IWebSocket<T>;
};

export class RoomService<T extends { type: string }> {
  constructor(
    private readonly readyRooms = new Map<string, ReadyRoom>(),
    private readonly matureRooms = new Map<string, MatureRoom<T>>(),
    private readonly wsId2RoomId = new Map<string, string>(),
  ) {}

  private createRoomId() {
    let id = "";
    let attempts = 0;

    do {
      attempts += 1;
      const moreLength = Math.floor(attempts / ROOM_ID_GENERATE_STEPS);
      id = nanoid(ROOM_ID_MIN_LENGTH + moreLength);
    } while (this.readyRooms.has(id) || this.matureRooms.has(id));

    return id;
  }

  private resolveMatureRoom(wsId: string) {
    const roomId = this.wsId2RoomId.get(wsId);
    if (!roomId) {
      return Fail("ROOM_NOT_FOUND", "Room connected not found");
    }
    const room = this.matureRooms.get(roomId);
    if (!room) {
      return Fail("ROOM_NOT_FOUND", "Maybe wsId2RoomId is broken");
    }
    return Ok(room);
  }

  public readyRoom() {
    const roomId = this.createRoomId();

    this.readyRooms.set(roomId, {
      id: roomId,
      timer: setTimeout(() => {
        this.readyRooms.delete(roomId);
      }, READY_ROOM_TIMEOUT_MS),
    });

    return roomId;
  }

  public joinRoom(ws: IWebSocket<T>, roomId: string) {
    const readyRoom = this.readyRooms.get(roomId);
    if (readyRoom) {
      clearTimeout(readyRoom.timer);
      this.readyRooms.delete(readyRoom.id);

      const room: MatureRoom<T> = {
        id: roomId,
        metronome: {
          bpm: DEFAULT_BPM,
          beats: DEFAULT_BEATS,
        },
        lastPlayAt: null,
        members: new Map(),
        owner: ws,
      };

      this.wsId2RoomId.set(ws.id, roomId);
      this.matureRooms.set(roomId, room);
      return Ok({ room });
    }

    const room = this.matureRooms.get(roomId);
    if (!room) {
      return Fail("ROOM_NOT_FOUND", "Room not found");
    }

    this.wsId2RoomId.set(ws.id, roomId);
    room.members.set(ws.id, ws);
    return Ok({ room });
  }

  public leaveRoom(wsId: string) {
    const room = this.resolveMatureRoom(wsId);
    if (!room.success) {
      return room;
    }
    this.wsId2RoomId.delete(wsId);

    if (room.data.owner.id !== wsId) {
      room.data.members.delete(wsId);
      return Ok({
        type: "member-left",
      });
    }
    const newOwner = room.data.members.values().next().value;
    if (!newOwner) {
      this.matureRooms.delete(room.data.id);
      return Ok({
        type: "room-closed",
      });
    }
    room.data.members.delete(wsId);
    room.data.owner = newOwner;
    return Ok({
      type: "owner-changed",
      owner: newOwner,
    });
  }

  public checkMessagable(wsId: string) {
    const room = this.resolveMatureRoom(wsId);
    if (!room.success) {
      return room;
    }
    if (room.data.owner.id !== wsId) {
      return Fail("UNAUTHORIZED", "Only owner can message");
    }
    return room;
  }
}
