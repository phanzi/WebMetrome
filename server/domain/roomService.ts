import { DEFAULT_BEATS, DEFAULT_BPM } from "@/constants";
import { Fail, Ok } from "@server/shared/result";
import { nanoid } from "nanoid";
import {
  ROOM_ID_GENERATE_ATTEMPTS,
  ROOM_ID_LENGTH,
  ROOM_ID_REGEX,
} from "./constants";

interface IWebSocket<T> {
  id: string;
  send: (data: T) => void;
}
type MetronomeState = {
  bpm: number;
  beats: number;
};

type Room<T extends { type: string }> = {
  id: string;
  metronome: MetronomeState;
  lastPlayAt: number | null;
  members: Map<string, IWebSocket<T>>;
  owner: IWebSocket<T>;
};

export class RoomService<T extends { type: string }> {
  constructor(
    private readonly rooms = new Map<string, Room<T>>(),
    public readonly wsId2RoomId = new Map<string, string>(),
  ) {}

  private createRoomId() {
    for (let attempt = 0; attempt < ROOM_ID_GENERATE_ATTEMPTS; attempt += 1) {
      const id = nanoid(ROOM_ID_LENGTH);
      if (!this.rooms.has(id)) {
        return Ok(id);
      }
    }
    return Fail("FAILED_TO_CREATE_ROOM_ID");
  }

  private resolveRoom(wsId: string) {
    const roomId = this.wsId2RoomId.get(wsId);
    if (!roomId) {
      return Fail("ROOM_NOT_FOUND", "No joined room");
    }
    const room = this.rooms.get(roomId);
    if (!room) {
      return Fail("ROOM_NOT_FOUND", "Maybe wsId2RoomId is broken");
    }
    return Ok(room);
  }

  public createRoom(ws: IWebSocket<T>) {
    const room = this.resolveRoom(ws.id);
    if (room.success) {
      return Fail("ALREADY_CREATED");
    }

    const id = this.createRoomId();
    if (!id.success) {
      return id;
    }
    this.wsId2RoomId.set(ws.id, id.data);
    this.rooms.set(id.data, {
      id: id.data,
      metronome: {
        bpm: DEFAULT_BPM,
        beats: DEFAULT_BEATS,
      },
      lastPlayAt: null,
      members: new Map(),
      owner: ws,
    });
    return Ok({ id: id.data });
  }

  public joinRoom(ws: IWebSocket<T>, roomId: string) {
    const resolvedRoom = this.resolveRoom(ws.id);
    if (resolvedRoom.success) {
      return Fail("ALREADY_JOINED", "Already joined any room");
    }
    if (!ROOM_ID_REGEX.test(roomId)) {
      return Fail("INVALID_ROOM_ID");
    }
    const room = this.rooms.get(roomId);
    if (!room) {
      return Fail("ROOM_NOT_FOUND", "Invalid room id");
    }

    this.wsId2RoomId.set(ws.id, roomId);
    room.members.set(ws.id, ws);

    return Ok({ room });
  }

  public leaveRoom(wsId: string) {
    const room = this.resolveRoom(wsId);
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
      this.rooms.delete(room.data.id);
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

  public setMetronomeState(wsId: string, metronome: MetronomeState) {
    const room = this.resolveRoom(wsId);
    if (!room.success) {
      return room;
    }
    if (room.data.owner.id !== wsId) {
      return Fail("UNAUTHORIZED", "Only owner can set metronome state");
    }
    room.data.metronome = metronome;
    return Ok({
      roomId: room.data.id,
    });
  }

  public setPlay(wsId: string, at: number) {
    const room = this.resolveRoom(wsId);
    if (!room.success) {
      return room;
    }
    if (room.data.owner.id !== wsId) {
      return Fail("UNAUTHORIZED", "Only owner can set play");
    }
    room.data.lastPlayAt = at;
    return Ok({
      roomId: room.data.id,
    });
  }

  public haltPlay(wsId: string) {
    const room = this.resolveRoom(wsId);
    if (!room.success) {
      return room;
    }
    if (room.data.owner.id !== wsId) {
      return Fail("UNAUTHORIZED", "Only owner can halt play");
    }
    room.data.lastPlayAt = null;
    return Ok({
      roomId: room.data.id,
    });
  }
}
