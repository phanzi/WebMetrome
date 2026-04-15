import { Fail, Ok } from "@server/shared/result";
import { nanoid } from "nanoid";
import {
  DEFAULT_BEATS,
  DEFAULT_BPM,
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
type PlayScheduleSnap = {
  startedAt: number;
};

type Room<T> = {
  id: string;
  metronomeState: MetronomeState;
  members: Map<string, IWebSocket<T>>;
  owner: IWebSocket<T>;
  playScheduleSnap: PlayScheduleSnap | null;
};

export class RoomService<T> {
  constructor(
    private readonly rooms = new Map<string, Room<T>>(),
    private readonly wsId2RoomId = new Map<string, string>(),
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

  public broadcast(wsId: string, payload: T) {
    const room = this.resolveRoom(wsId);
    if (!room.success) {
      return room;
    }
    if (room.data.owner.id !== wsId) {
      return Fail("UNAUTHORIZED", "Only owner can broadcast");
    }
    for (const member of room.data.members.values()) {
      member.send(payload);
    }
    return Ok("OK");
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
      metronomeState: {
        bpm: DEFAULT_BPM,
        beats: DEFAULT_BEATS,
      },
      members: new Map(),
      owner: ws,
      playScheduleSnap: null,
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

    return Ok({
      metronomeState: room.metronomeState,
      playScheduleSnap: room.playScheduleSnap,
    });
  }

  public setMetronomeState(wsId: string, metronomeState: MetronomeState) {
    const room = this.resolveRoom(wsId);
    if (!room.success) {
      return room;
    }
    if (room.data.owner.id !== wsId) {
      return Fail("UNAUTHORIZED", "Only owner can set metronome state");
    }
    room.data.metronomeState = metronomeState;
    return Ok("OK");
  }

  public schedulePlay(wsId: string, snap: PlayScheduleSnap) {
    const room = this.resolveRoom(wsId);
    if (!room.success) {
      return room;
    }
    if (room.data.owner.id !== wsId) {
      return Fail("UNAUTHORIZED", "Only owner can schedule play");
    }

    room.data.playScheduleSnap = snap;
    return Ok(room.data.playScheduleSnap);
  }

  public haltPlay(wsId: string) {
    const room = this.resolveRoom(wsId);
    if (!room.success) {
      return room;
    }
    if (room.data.owner.id !== wsId) {
      return Fail("UNAUTHORIZED", "Only owner can halt play");
    }

    room.data.playScheduleSnap = null;
    return Ok("OK");
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
}
