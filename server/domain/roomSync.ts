import type { ResponseSchema } from "@server/app";
import { inRange, isNumber } from "es-toolkit";
import { isInteger, isObject } from "es-toolkit/compat";
import { z } from "zod";
import {
  ALLOWED_BEATS,
  DEFAULT_BEATS,
  DEFAULT_BPM,
  MAX_BPM,
  MIN_BPM,
  PLAY_SCHEDULE_FUTURE_LIMIT_MS,
  PLAY_SCHEDULE_PAST_TOLERANCE_MS,
  ROOM_ID_ALPHABET,
  ROOM_ID_GENERATE_ATTEMPTS,
  ROOM_ID_PATTERN,
  ROOM_ID_RANDOM_LENGTH,
} from "./constants";

export type MetronomeState = {
  bpm: number;
  beats: number;
};

export type ClientRole = "owner" | "member";

type PlayScheduleMessage = Extract<ResponseSchema, { type: "play-schedule" }>;

type Member = {
  send: (data: ResponseSchema) => void;
};

type CreateRoomSyncServiceOptions = {
  now?: () => number;
};

const roomIdSchema = z.string().trim().toUpperCase().regex(ROOM_ID_PATTERN);

const createDefaultMetronomeState = (): MetronomeState => ({
  bpm: DEFAULT_BPM,
  beats: DEFAULT_BEATS,
});

type Room = {
  ownerConnectionId: string;
  members: Set<string>;
  metronomeState: MetronomeState;
  lastPlaySchedule: PlayScheduleMessage | null;
};

export const normalizeRoomId = (roomId: string): string | null => {
  const parsed = roomIdSchema.safeParse(roomId);
  return parsed.success ? parsed.data : null;
};

export const isValidMetronomeState = (
  payload: unknown,
): payload is MetronomeState => {
  if (!isObject(payload)) {
    return false;
  }
  const candidate = payload as { bpm?: unknown; beats?: unknown };
  if (
    !isNumber(candidate.bpm) ||
    !isNumber(candidate.beats) ||
    !isInteger(candidate.bpm) ||
    !isInteger(candidate.beats)
  ) {
    return false;
  }
  return (
    inRange(candidate.bpm, MIN_BPM, MAX_BPM + 1) &&
    ALLOWED_BEATS.has(candidate.beats)
  );
};

const createRoomId = (existing: Set<string>): string => {
  for (let attempt = 0; attempt < ROOM_ID_GENERATE_ATTEMPTS; attempt += 1) {
    const random = crypto.getRandomValues(
      new Uint32Array(ROOM_ID_RANDOM_LENGTH),
    );
    const next = Array.from(
      random,
      (value) => ROOM_ID_ALPHABET[value % ROOM_ID_ALPHABET.length],
    ).join("");
    if (!existing.has(next)) {
      return next;
    }
  }
  throw new Error("Failed to create unique room id");
};

const validatePlayScheduleAt = (at: number, getNow: () => number): boolean => {
  const now = getNow();
  // inclusive upper bound by adding +1 to half-open inRange
  return inRange(
    at,
    now - PLAY_SCHEDULE_PAST_TOLERANCE_MS,
    now + PLAY_SCHEDULE_FUTURE_LIMIT_MS + 1,
  );
};

export function createRoomSyncService(
  options: CreateRoomSyncServiceOptions = {},
) {
  const getNow = options.now ?? Date.now;
  const rooms = new Map<string, Room>();
  const connectionRoom = new Map<string, string | null>();

  const removeRoomMembership = (
    roomId: string | null,
    connectionId: string,
  ) => {
    if (!roomId) {
      return;
    }
    const room = rooms.get(roomId);
    if (!room) {
      return;
    }

    room.members.delete(connectionId);
    if (room.ownerConnectionId === connectionId || room.members.size === 0) {
      for (const memberId of room.members) {
        const member = members.get(memberId);
        member?.send({
          type: "error",
          code: "INVALID_ROOM",
          message: "방이 종료되었습니다.",
        });
        connectionRoom.set(memberId, null);
      }
      rooms.delete(roomId);
      return;
    }

    rooms.set(roomId, room);
  };

  const canOwnerControl = (room: Room, connectionId: string): boolean =>
    room.ownerConnectionId === connectionId;

  const broadcast = (roomId: string, message: ResponseSchema) => {
    const room = rooms.get(roomId);
    if (!room) {
      return;
    }
    for (const memberId of room.members) {
      const member = members.get(memberId);
      if (!member) {
        continue;
      }
      member.send(message);
    }
  };

  const members = new Map<string, Member>();

  const removeFromRoom = (roomId: string | null, id: string) => {
    removeRoomMembership(roomId, id);
  };

  return {
    open(connectionId: string, send: (data: ResponseSchema) => void) {
      members.set(connectionId, { send });
      connectionRoom.set(connectionId, null);
    },

    createRoom(
      connectionId: string,
    ): { ok: true; roomId: string } | { ok: false } {
      if (!members.has(connectionId)) {
        return { ok: false };
      }
      const prevRoom = connectionRoom.get(connectionId) ?? null;
      removeRoomMembership(prevRoom, connectionId);

      const roomId = createRoomId(new Set(rooms.keys()));
      const room: Room = {
        ownerConnectionId: connectionId,
        members: new Set([connectionId]),
        metronomeState: createDefaultMetronomeState(),
        lastPlaySchedule: null,
      };

      rooms.set(roomId, room);
      connectionRoom.set(connectionId, roomId);
      return { ok: true, roomId };
    },

    joinRoom(
      connectionId: string,
      roomId: string,
    ):
      | {
          ok: true;
          roomId: string;
          role: ClientRole;
          metronomeState: MetronomeState;
          replayPlaySchedule: PlayScheduleMessage | null;
        }
      | {
          ok: false;
          code: "INVALID_ROOM";
        } {
      const normalized = normalizeRoomId(roomId);
      if (!normalized) {
        return { ok: false, code: "INVALID_ROOM" };
      }

      const room = rooms.get(normalized);
      if (!room) {
        return { ok: false, code: "INVALID_ROOM" };
      }

      const prevRoom = connectionRoom.get(connectionId) ?? null;
      removeRoomMembership(prevRoom, connectionId);

      room.members.add(connectionId);
      rooms.set(normalized, room);
      connectionRoom.set(connectionId, normalized);

      return {
        ok: true,
        roomId: normalized,
        role: room.ownerConnectionId === connectionId ? "owner" : "member",
        metronomeState: { ...room.metronomeState },
        replayPlaySchedule: room.lastPlaySchedule
          ? { ...room.lastPlaySchedule }
          : null,
      };
    },

    replaceMetronomeState(
      connectionId: string,
      payload: MetronomeState,
    ):
      | { ok: true; roomId: string; metronomeState: MetronomeState }
      | {
          ok: false;
          code: "INVALID_ROOM" | "UNAUTHORIZED" | "INVALID_PAYLOAD";
        } {
      const roomId = connectionRoom.get(connectionId) ?? null;
      if (!roomId) {
        return { ok: false, code: "INVALID_ROOM" };
      }

      const room = rooms.get(roomId);
      if (!room) {
        return { ok: false, code: "INVALID_ROOM" };
      }

      if (!canOwnerControl(room, connectionId)) {
        return { ok: false, code: "UNAUTHORIZED" };
      }

      if (!isValidMetronomeState(payload)) {
        return { ok: false, code: "INVALID_PAYLOAD" };
      }

      const metronomeState = {
        bpm: payload.bpm,
        beats: payload.beats,
      };
      room.metronomeState = metronomeState;
      rooms.set(roomId, room);

      broadcast(roomId, {
        type: "metronome-state",
        roomId,
        metronome: metronomeState,
      });

      return { ok: true, roomId, metronomeState };
    },

    relayPlaySchedule(
      connectionId: string,
      payload: { at: number },
    ):
      | { ok: true; roomId: string; at: number }
      | {
          ok: false;
          code: "INVALID_ROOM" | "UNAUTHORIZED" | "INVALID_PAYLOAD";
        } {
      const roomId = connectionRoom.get(connectionId) ?? null;
      if (!roomId) {
        return { ok: false, code: "INVALID_ROOM" };
      }

      const room = rooms.get(roomId);
      if (!room) {
        return { ok: false, code: "INVALID_ROOM" };
      }
      if (!canOwnerControl(room, connectionId)) {
        return { ok: false, code: "UNAUTHORIZED" };
      }

      if (
        !isObject(payload) ||
        !isNumber(payload.at) ||
        !isInteger(payload.at)
      ) {
        return { ok: false, code: "INVALID_PAYLOAD" };
      }
      const at = payload.at;
      if (!validatePlayScheduleAt(at, getNow)) {
        return { ok: false, code: "INVALID_PAYLOAD" };
      }

      const schedule: PlayScheduleMessage = {
        type: "play-schedule",
        roomId,
        at,
      };
      room.lastPlaySchedule = schedule;
      rooms.set(roomId, room);

      broadcast(roomId, schedule);
      return { ok: true, roomId, at };
    },

    relayPlayHalt(connectionId: string):
      | { ok: true; roomId: string }
      | {
          ok: false;
          code: "INVALID_ROOM" | "UNAUTHORIZED";
        } {
      const roomId = connectionRoom.get(connectionId) ?? null;
      if (!roomId) {
        return { ok: false, code: "INVALID_ROOM" };
      }

      const room = rooms.get(roomId);
      if (!room) {
        return { ok: false, code: "INVALID_ROOM" };
      }
      if (!canOwnerControl(room, connectionId)) {
        return { ok: false, code: "UNAUTHORIZED" };
      }

      room.lastPlaySchedule = null;
      rooms.set(roomId, room);

      broadcast(roomId, {
        type: "play-halt",
        roomId,
      });
      return { ok: true, roomId };
    },

    close(connectionId: string) {
      const roomId = connectionRoom.get(connectionId) ?? null;
      removeFromRoom(roomId, connectionId);
      connectionRoom.delete(connectionId);
      members.delete(connectionId);
    },

    getConnectionRoom(connectionId: string): string | null {
      return connectionRoom.get(connectionId) ?? null;
    },

    getRoomSize(roomId: string): number {
      return rooms.get(roomId.toUpperCase())?.members.size ?? 0;
    },
  };
}
